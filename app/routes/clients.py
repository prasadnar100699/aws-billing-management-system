from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.users import User
from app.models.clients import Client
from app.models.documents import Document
from app.models.audit_log import AuditLog
from werkzeug.utils import secure_filename
import os

clients_bp = Blueprint('clients', __name__)

@clients_bp.route('/')
@jwt_required()
def list_clients():
    """List all clients."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    
    query = Client.query
    
    # Filter based on user role
    if user.is_client_manager:
        query = query.filter_by(manager_id=user_id)
    
    # Apply search filter
    if search:
        query = query.filter(Client.name.contains(search))
    
    clients = query.filter_by(is_active=True)\
        .order_by(Client.name)\
        .paginate(page=page, per_page=20, error_out=False)
    
    if request.is_json:
        return jsonify({
            'clients': [c.to_dict() for c in clients.items],
            'total': clients.total,
            'pages': clients.pages,
            'current_page': page
        })
    
    return render_template('clients/list.html', clients=clients, search=search)

@clients_bp.route('/create', methods=['GET', 'POST'])
@jwt_required()
def create_client():
    """Create new client."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not (user.is_super_admin or user.is_client_manager):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('clients.list_clients'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        try:
            client = Client(
                name=data.get('name'),
                company_name=data.get('company_name'),
                email=data.get('email'),
                phone=data.get('phone'),
                address_line1=data.get('address_line1'),
                address_line2=data.get('address_line2'),
                city=data.get('city'),
                state=data.get('state'),
                postal_code=data.get('postal_code'),
                country=data.get('country', 'India'),
                gst_number=data.get('gst_number'),
                currency_preference=data.get('currency_preference', 'INR'),
                payment_terms=int(data.get('payment_terms', 30)),
                manager_id=data.get('manager_id') if user.is_super_admin else user_id,
                notes=data.get('notes')
            )
            
            db.session.add(client)
            db.session.commit()
            
            # Log creation
            AuditLog.log_action(
                user_id=user_id,
                action='create',
                resource_type='client',
                resource_id=client.id,
                new_values=client.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Client created successfully', 'client': client.to_dict()}), 201
            
            flash('Client created successfully', 'success')
            return redirect(url_for('clients.view_client', client_id=client.id))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to create client: {str(e)}'}), 400
            flash(f'Failed to create client: {str(e)}', 'error')
    
    # Get available managers for super admin
    managers = []
    if user.is_super_admin:
        managers = User.query.filter(
            User.role.has(name='Client Manager'),
            User.is_active == True
        ).all()
    
    return render_template('clients/create.html', managers=managers)

@clients_bp.route('/<int:client_id>')
@jwt_required()
def view_client(client_id):
    """View client details."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    client = Client.query.get_or_404(client_id)
    
    # Check access permissions
    if user.is_client_manager and client.manager_id != user_id:
        if request.is_json:
            return jsonify({'error': 'Access denied'}), 403
        flash('Access denied', 'error')
        return redirect(url_for('clients.list_clients'))
    
    # Get client's invoices and documents
    invoices = client.invoices.order_by(client.invoices.property.mapper.class_.created_at.desc()).limit(10).all()
    documents = client.documents.filter_by(is_active=True).order_by(Document.created_at.desc()).limit(10).all()
    
    # Log access
    AuditLog.log_action(
        user_id=user_id,
        action='read',
        resource_type='client',
        resource_id=client_id
    )
    
    if request.is_json:
        return jsonify({
            'client': client.to_dict(),
            'recent_invoices': [inv.to_dict() for inv in invoices],
            'recent_documents': [doc.to_dict() for doc in documents]
        })
    
    return render_template('clients/view.html', client=client, invoices=invoices, documents=documents)

@clients_bp.route('/<int:client_id>/edit', methods=['GET', 'POST'])
@jwt_required()
def edit_client(client_id):
    """Edit client details."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    client = Client.query.get_or_404(client_id)
    
    # Check permissions
    if not (user.is_super_admin or (user.is_client_manager and client.manager_id == user_id)):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('clients.view_client', client_id=client_id))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        # Store old values for audit log
        old_values = client.to_dict()
        
        try:
            # Update client fields
            client.name = data.get('name', client.name)
            client.company_name = data.get('company_name', client.company_name)
            client.email = data.get('email', client.email)
            client.phone = data.get('phone', client.phone)
            client.address_line1 = data.get('address_line1', client.address_line1)
            client.address_line2 = data.get('address_line2', client.address_line2)
            client.city = data.get('city', client.city)
            client.state = data.get('state', client.state)
            client.postal_code = data.get('postal_code', client.postal_code)
            client.country = data.get('country', client.country)
            client.gst_number = data.get('gst_number', client.gst_number)
            client.currency_preference = data.get('currency_preference', client.currency_preference)
            client.payment_terms = int(data.get('payment_terms', client.payment_terms))
            client.notes = data.get('notes', client.notes)
            
            # Only super admin can change manager
            if user.is_super_admin and 'manager_id' in data:
                client.manager_id = int(data.get('manager_id'))
            
            db.session.commit()
            
            # Log update
            AuditLog.log_action(
                user_id=user_id,
                action='update',
                resource_type='client',
                resource_id=client_id,
                old_values=old_values,
                new_values=client.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Client updated successfully', 'client': client.to_dict()})
            
            flash('Client updated successfully', 'success')
            return redirect(url_for('clients.view_client', client_id=client_id))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to update client: {str(e)}'}), 400
            flash(f'Failed to update client: {str(e)}', 'error')
    
    # Get available managers for super admin
    managers = []
    if user.is_super_admin:
        managers = User.query.filter(
            User.role.has(name='Client Manager'),
            User.is_active == True
        ).all()
    
    return render_template('clients/edit.html', client=client, managers=managers)

@clients_bp.route('/<int:client_id>/documents')
@jwt_required()
def client_documents(client_id):
    """View client documents."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    client = Client.query.get_or_404(client_id)
    
    # Check access permissions
    if user.is_client_manager and client.manager_id != user_id:
        if request.is_json:
            return jsonify({'error': 'Access denied'}), 403
        flash('Access denied', 'error')
        return redirect(url_for('clients.list_clients'))
    
    page = request.args.get('page', 1, type=int)
    category = request.args.get('category', '')
    
    query = client.documents.filter_by(is_active=True)
    
    if category:
        query = query.filter_by(category=category)
    
    documents = query.order_by(Document.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    if request.is_json:
        return jsonify({
            'documents': [doc.to_dict() for doc in documents.items],
            'total': documents.total,
            'pages': documents.pages,
            'current_page': page
        })
    
    return render_template('clients/documents.html', client=client, documents=documents, category=category)

@clients_bp.route('/<int:client_id>/upload-document', methods=['POST'])
@jwt_required()
def upload_document(client_id):
    """Upload document for client."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    client = Client.query.get_or_404(client_id)
    
    # Check permissions
    if not (user.is_super_admin or (user.is_client_manager and client.manager_id == user_id)):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('clients.client_documents', client_id=client_id))
    
    if 'document' not in request.files:
        if request.is_json:
            return jsonify({'error': 'No file uploaded'}), 400
        flash('No file uploaded', 'error')
        return redirect(url_for('clients.client_documents', client_id=client_id))
    
    file = request.files['document']
    if file.filename == '':
        if request.is_json:
            return jsonify({'error': 'No file selected'}), 400
        flash('No file selected', 'error')
        return redirect(url_for('clients.client_documents', client_id=client_id))
    
    try:
        # Create client document directory
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(client_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        # Secure filename and save
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Create document record
        document = Document(
            client_id=client_id,
            name=request.form.get('name', filename),
            original_filename=filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            mime_type=file.content_type,
            category=request.form.get('category', 'general'),
            tags=request.form.get('tags', ''),
            uploaded_by=user_id,
            description=request.form.get('description', ''),
            is_confidential=request.form.get('is_confidential') == 'on'
        )
        
        db.session.add(document)
        db.session.commit()
        
        # Log upload
        AuditLog.log_action(
            user_id=user_id,
            action='create',
            resource_type='document',
            resource_id=document.id,
            new_values=document.to_dict()
        )
        
        if request.is_json:
            return jsonify({'message': 'Document uploaded successfully', 'document': document.to_dict()}), 201
        
        flash('Document uploaded successfully', 'success')
        
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'error': f'Failed to upload document: {str(e)}'}), 400
        flash(f'Failed to upload document: {str(e)}', 'error')
    
    return redirect(url_for('clients.client_documents', client_id=client_id))