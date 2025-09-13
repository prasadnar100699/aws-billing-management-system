from flask import request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from app.documents import bp
from app.models import Document, Client, Invoice
from app import db
from app.utils.auth import require_permission, get_current_user
from app.utils.audit import log_user_action
from app.utils.validation import validate_file_extension, validate_file_size, sanitize_filename
from sqlalchemy import or_
import os
from datetime import datetime

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg'}

@bp.route('/', methods=['POST'])
@require_permission('Documents', 'create')
def upload_document():
    """Upload a document"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get form data
        document_name = request.form.get('document_name') or file.filename
        document_type = request.form.get('type', 'other')
        client_id = request.form.get('client_id', type=int)
        invoice_id = request.form.get('invoice_id', type=int)
        
        # Validate file
        if not validate_file_extension(file.filename, ALLOWED_EXTENSIONS):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if not validate_file_size(file_size):
            return jsonify({'error': 'File too large. Maximum size: 16MB'}), 400
        
        # Validate client access if provided
        if client_id:
            client = Client.query.get(client_id)
            if not client:
                return jsonify({'error': 'Client not found'}), 404
            
            if current_user.role.role_name == 'Client Manager':
                if current_user not in client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
        
        # Validate invoice access if provided
        if invoice_id:
            invoice = Invoice.query.get(invoice_id)
            if not invoice:
                return jsonify({'error': 'Invoice not found'}), 404
            
            if current_user.role.role_name == 'Client Manager':
                if current_user not in invoice.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
        
        # Create upload directory
        upload_dir = os.path.join(current_app.config['UPLOAD_DIR'], 'documents')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filename = secure_filename(file.filename)
        filename = sanitize_filename(filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(upload_dir, filename)
        
        file.save(file_path)
        
        # Create document record
        document = Document(
            document_name=document_name,
            uploaded_by=current_user.user_id,
            type=document_type,
            size=file_size,
            file_path=file_path,
            client_id=client_id,
            invoice_id=invoice_id
        )
        
        db.session.add(document)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'upload_document', 
                       f"Uploaded document: {document_name}")
        
        return jsonify({
            'message': 'Document uploaded successfully',
            'document': document.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Upload document error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['GET'])
@require_permission('Documents', 'view')
def list_documents():
    """List documents with pagination and filtering"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'upload_date')
        search = request.args.get('search', '')
        document_type = request.args.get('type')
        client_id = request.args.get('client_id', type=int)
        invoice_id = request.args.get('invoice_id', type=int)
        
        # Build query
        query = Document.query
        
        # For Client Managers, only show documents for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(or_(
                Document.client_id.in_(assigned_client_ids),
                Document.client_id.is_(None)  # Allow documents not associated with clients
            ))
        
        # Apply search filter
        if search:
            query = query.filter(Document.document_name.contains(search))
        
        # Apply type filter
        if document_type:
            query = query.filter(Document.type == document_type)
        
        # Apply client filter
        if client_id:
            query = query.filter(Document.client_id == client_id)
        
        # Apply invoice filter
        if invoice_id:
            query = query.filter(Document.invoice_id == invoice_id)
        
        # Apply sorting
        if sort == 'upload_date':
            query = query.order_by(Document.upload_date.desc())
        elif sort == 'document_name':
            query = query.order_by(Document.document_name)
        elif sort == 'type':
            query = query.order_by(Document.type)
        elif sort == 'size':
            query = query.order_by(Document.size.desc())
        else:
            query = query.order_by(Document.upload_date.desc())
        
        # Paginate results
        documents = query.paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'documents': [doc.to_dict() for doc in documents.items],
            'total': documents.total,
            'pages': documents.pages,
            'current_page': page,
            'per_page': limit
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List documents error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:document_id>', methods=['GET'])
@require_permission('Documents', 'view')
def download_document(document_id):
    """Download a document"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        document = Document.query.get_or_404(document_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if document.client_id:
                if current_user not in document.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif document.invoice_id:
                if current_user not in document.invoice.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
        
        # Check if file exists
        if not os.path.exists(document.file_path):
            return jsonify({'error': 'File not found'}), 404
        
        log_user_action(current_user.user_id, 'download_document', 
                       f"Downloaded document: {document.document_name}")
        
        return send_file(
            document.file_path,
            as_attachment=True,
            download_name=document.document_name
        )
        
    except Exception as e:
        current_app.logger.error(f"Download document error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:document_id>/info', methods=['GET'])
@require_permission('Documents', 'view')
def get_document_info(document_id):
    """Get document information without downloading"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        document = Document.query.get_or_404(document_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if document.client_id:
                if current_user not in document.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif document.invoice_id:
                if current_user not in document.invoice.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'document': document.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get document info error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:document_id>', methods=['DELETE'])
@require_permission('Documents', 'delete')
def delete_document(document_id):
    """Delete a document"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        document = Document.query.get_or_404(document_id)
        
        # Check access for Client Managers
        if current_user.role.role_name == 'Client Manager':
            if document.client_id:
                if current_user not in document.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
            elif document.invoice_id:
                if current_user not in document.invoice.client.assigned_managers:
                    return jsonify({'error': 'Access denied'}), 403
        
        # Delete file from filesystem
        if os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
            except OSError:
                pass  # File might be in use or already deleted
        
        # Delete database record
        db.session.delete(document)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_document', 
                       f"Deleted document: {document.document_name}")
        
        return jsonify({'message': 'Document deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete document error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/types', methods=['GET'])
@require_permission('Documents', 'view')
def get_document_types():
    """Get available document types"""
    try:
        types = [
            {'value': 'invoice', 'label': 'Invoice'},
            {'value': 'contract', 'label': 'Contract'},
            {'value': 'usage_log', 'label': 'Usage Log'},
            {'value': 'other', 'label': 'Other'}
        ]
        
        return jsonify({'types': types}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get document types error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500