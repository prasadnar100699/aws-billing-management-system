from flask import request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from app.usage import bp
from app.models import UsageImport, Client
from app import db
from app.utils.auth import require_permission
from app.utils.audit import log_user_action
from app.utils.validation import validate_file_extension, validate_file_size, sanitize_filename
from app.tasks.usage_importer import process_usage_import
import os
from datetime import datetime

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

@bp.route('/import', methods=['POST'])
@login_required
@require_permission('Usage', 'create')
def import_usage():
    """Upload and import AWS usage data"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get form data
        client_id = request.form.get('client_id', type=int)
        source = request.form.get('source', 'CSV')
        
        if not client_id:
            return jsonify({'error': 'client_id is required'}), 400
        
        # Validate client exists and user has access
        client = Client.query.get(client_id)
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Validate file
        if not validate_file_extension(file.filename, ALLOWED_EXTENSIONS):
            return jsonify({'error': 'Invalid file type. Allowed: CSV, Excel'}), 400
        
        # Check file size (get size by seeking to end)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if not validate_file_size(file_size):
            return jsonify({'error': 'File too large. Maximum size: 16MB'}), 400
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(current_app.config['UPLOAD_DIR'], 'usage_imports')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filename = secure_filename(file.filename)
        filename = sanitize_filename(filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{client_id}_{timestamp}_{filename}"
        file_path = os.path.join(upload_dir, filename)
        
        file.save(file_path)
        
        # Create usage import record
        usage_import = UsageImport(
            client_id=client_id,
            source=source,
            status='pending',
            file_path=file_path
        )
        
        db.session.add(usage_import)
        db.session.commit()
        
        # Queue processing task
        task = process_usage_import.delay(usage_import.import_id)
        
        log_user_action(current_user.user_id, 'import_usage', 
                       f"Uploaded usage file for client: {client.client_name}")
        
        return jsonify({
            'message': 'Usage import queued successfully',
            'import_id': usage_import.import_id,
            'task_id': task.id
        }), 202
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Import usage error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/imports', methods=['GET'])
@login_required
@require_permission('Usage', 'view')
def list_imports():
    """List usage import history"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'import_date')
        client_id = request.args.get('client_id', type=int)
        status = request.args.get('status')
        
        # Build query
        query = UsageImport.query
        
        # For Client Managers, only show imports for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(UsageImport.client_id.in_(assigned_client_ids))
        
        # Apply filters
        if client_id:
            query = query.filter(UsageImport.client_id == client_id)
        
        if status:
            query = query.filter(UsageImport.status == status)
        
        # Apply sorting
        if sort == 'import_date':
            query = query.order_by(UsageImport.import_date.desc())
        elif sort == 'processed_at':
            query = query.order_by(UsageImport.processed_at.desc())
        elif sort == 'status':
            query = query.order_by(UsageImport.status)
        else:
            query = query.order_by(UsageImport.import_date.desc())
        
        # Paginate results
        imports = query.paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'imports': [imp.to_dict() for imp in imports.items],
            'total': imports.total,
            'pages': imports.pages,
            'current_page': page,
            'per_page': limit
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List imports error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/imports/<int:import_id>', methods=['GET'])
@login_required
@require_permission('Usage', 'view')
def get_import(import_id):
    """Get usage import details"""
    try:
        usage_import = UsageImport.query.get_or_404(import_id)
        
        # Check if Client Manager has access
        if current_user.role.role_name == 'Client Manager':
            if current_user not in usage_import.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'import': usage_import.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get import error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/imports/<int:import_id>', methods=['PUT'])
@login_required
@require_permission('Usage', 'edit')
def retry_import(import_id):
    """Retry failed usage import"""
    try:
        usage_import = UsageImport.query.get_or_404(import_id)
        
        # Check if Client Manager has access
        if current_user.role.role_name == 'Client Manager':
            if current_user not in usage_import.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Only allow retry for failed imports
        if usage_import.status.value != 'failed':
            return jsonify({'error': 'Can only retry failed imports'}), 400
        
        # Reset status and queue processing
        usage_import.status = 'pending'
        usage_import.errors = None
        usage_import.processed_lines = 0
        db.session.commit()
        
        # Queue processing task
        task = process_usage_import.delay(import_id)
        
        log_user_action(current_user.user_id, 'retry_import', 
                       f"Retried usage import: {import_id}")
        
        return jsonify({
            'message': 'Usage import retry queued',
            'task_id': task.id
        }), 202
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Retry import error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/imports/<int:import_id>', methods=['DELETE'])
@login_required
@require_permission('Usage', 'delete')
def delete_import(import_id):
    """Delete usage import record"""
    try:
        usage_import = UsageImport.query.get_or_404(import_id)
        
        # Check if Client Manager has access
        if current_user.role.role_name == 'Client Manager':
            if current_user not in usage_import.client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Delete file if exists
        if usage_import.file_path and os.path.exists(usage_import.file_path):
            try:
                os.remove(usage_import.file_path)
            except OSError:
                pass  # File might be in use or already deleted
        
        db.session.delete(usage_import)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_import', 
                       f"Deleted usage import: {import_id}")
        
        return jsonify({'message': 'Usage import deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete import error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/process', methods=['POST'])
@login_required
@require_permission('Usage', 'edit')
def process_pending_imports():
    """Process all pending usage imports"""
    try:
        # Get pending imports
        query = UsageImport.query.filter_by(status='pending')
        
        # For Client Managers, only process imports for assigned clients
        if current_user.role.role_name == 'Client Manager':
            assigned_client_ids = [client.client_id for client in current_user.assigned_clients]
            query = query.filter(UsageImport.client_id.in_(assigned_client_ids))
        
        pending_imports = query.all()
        
        if not pending_imports:
            return jsonify({'message': 'No pending imports found'}), 200
        
        # Queue processing tasks
        task_ids = []
        for usage_import in pending_imports:
            task = process_usage_import.delay(usage_import.import_id)
            task_ids.append(task.id)
        
        log_user_action(current_user.user_id, 'process_imports', 
                       f"Queued processing for {len(pending_imports)} imports")
        
        return jsonify({
            'message': f'Queued processing for {len(pending_imports)} imports',
            'task_ids': task_ids
        }), 202
        
    except Exception as e:
        current_app.logger.error(f"Process imports error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/api-import', methods=['POST'])
@login_required
@require_permission('Usage', 'create')
def api_import():
    """Import usage data from AWS Cost Explorer API"""
    try:
        data = request.get_json()
        
        if not data.get('client_id'):
            return jsonify({'error': 'client_id is required'}), 400
        
        # Validate client exists and user has access
        client = Client.query.get(data['client_id'])
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        # Create usage import record
        usage_import = UsageImport(
            client_id=data['client_id'],
            source='API',
            status='pending'
        )
        
        db.session.add(usage_import)
        db.session.commit()
        
        # Queue API import task (would need to be implemented)
        # task = process_api_import.delay(usage_import.import_id, data)
        
        log_user_action(current_user.user_id, 'api_import', 
                       f"Queued API import for client: {client.client_name}")
        
        return jsonify({
            'message': 'API import queued successfully',
            'import_id': usage_import.import_id
        }), 202
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"API import error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/mappings', methods=['GET'])
@login_required
@require_permission('Usage', 'view')
def get_service_mappings():
    """Get AWS service code to internal service mappings"""
    try:
        from app.models import Service
        
        services = Service.query.filter(Service.aws_service_code.isnot(None)).all()
        
        mappings = {}
        for service in services:
            mappings[service.aws_service_code] = {
                'service_id': service.service_id,
                'service_name': service.service_name,
                'components': [comp.to_dict() for comp in service.pricing_components]
            }
        
        return jsonify({'mappings': mappings}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get service mappings error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500