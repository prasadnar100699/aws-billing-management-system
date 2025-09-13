from flask import request, jsonify, current_app
from app.clients import bp
from app.models import Client, ClientAwsMapping, user_client_mappings
from app import db
from app.utils.auth import require_permission, get_current_user
from app.utils.audit import log_user_action
from app.utils.validation import validate_email, validate_gst_number
from sqlalchemy import or_
import re

@bp.route('/', methods=['POST'])
@require_permission('Clients', 'create')
def create_client():
    """Create a new client"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['client_name', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate GST number if provided
        if data.get('gst_registered') and data.get('gst_number'):
            if not validate_gst_number(data['gst_number']):
                return jsonify({'error': 'Invalid GST number format'}), 400
        
        # Check if client already exists
        if Client.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Client with this email already exists'}), 409
        
        # Create new client
        client = Client(
            client_name=data['client_name'],
            contact_person=data.get('contact_person'),
            email=data['email'],
            phone=data.get('phone'),
            gst_registered=data.get('gst_registered', False),
            gst_number=data.get('gst_number') if data.get('gst_registered') else None,
            billing_address=data.get('billing_address'),
            invoice_preferences=data.get('invoice_preferences', 'monthly'),
            default_currency=data.get('default_currency', 'USD'),
            status=data.get('status', 'active')
        )
        
        # Set AWS account IDs
        if data.get('aws_account_ids'):
            client.set_aws_account_ids(data['aws_account_ids'])
        
        db.session.add(client)
        db.session.flush()  # Get the client_id
        
        # Create AWS mappings if provided
        aws_mappings = data.get('aws_mappings', [])
        for mapping in aws_mappings:
            aws_mapping = ClientAwsMapping(
                client_id=client.client_id,
                aws_account_id=mapping['aws_account_id'],
                billing_tag_key=mapping.get('billing_tag_key'),
                billing_tag_value=mapping.get('billing_tag_value')
            )
            db.session.add(aws_mapping)
        
        # Assign client to current user if they're a Client Manager
        if current_user.role.role_name == 'Client Manager':
            client.assigned_managers.append(current_user)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_client', f"Created client: {client.client_name}")
        
        return jsonify({
            'message': 'Client created successfully',
            'client': client.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create client error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['GET'])
@require_permission('Clients', 'view')
def list_clients():
    """List clients with pagination and filtering"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'client_name')
        search = request.args.get('search', '')
        status = request.args.get('status')
        
        # Build query
        query = Client.query
        
        # For Client Managers, only show assigned clients
        if current_user.role.role_name == 'Client Manager':
            query = query.filter(Client.assigned_managers.contains(current_user))
        
        # Apply search filter
        if search:
            query = query.filter(or_(
                Client.client_name.contains(search),
                Client.email.contains(search),
                Client.contact_person.contains(search)
            ))
        
        # Apply status filter
        if status:
            query = query.filter(Client.status == status)
        
        # Apply sorting
        if sort == 'client_name':
            query = query.order_by(Client.client_name)
        elif sort == 'email':
            query = query.order_by(Client.email)
        elif sort == 'created_at':
            query = query.order_by(Client.created_at.desc())
        else:
            query = query.order_by(Client.client_name)
        
        # Paginate results
        clients = query.paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'clients': [client.to_dict() for client in clients.items],
            'total': clients.total,
            'pages': clients.pages,
            'current_page': page,
            'per_page': limit
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List clients error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:client_id>', methods=['GET'])
@require_permission('Clients', 'view')
def get_client(client_id):
    """Get client details"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        client = Client.query.get_or_404(client_id)
        
        # Check if Client Manager has access to this client
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'client': client.to_dict(),
            'aws_mappings': [mapping.to_dict() for mapping in client.aws_mappings],
            'assigned_managers': [user.to_dict() for user in client.assigned_managers]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get client error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:client_id>', methods=['PUT'])
@require_permission('Clients', 'edit')
def update_client(client_id):
    """Update client details"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        client = Client.query.get_or_404(client_id)
        
        # Check if Client Manager has access to this client
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Validate email if provided
        if 'email' in data and data['email'] != client.email:
            if not validate_email(data['email']):
                return jsonify({'error': 'Invalid email format'}), 400
            
            # Check if email already exists
            if Client.query.filter(Client.email == data['email'], Client.client_id != client_id).first():
                return jsonify({'error': 'Email already exists'}), 409
            
            client.email = data['email']
        
        # Update other fields
        if 'client_name' in data:
            client.client_name = data['client_name']
        if 'contact_person' in data:
            client.contact_person = data['contact_person']
        if 'phone' in data:
            client.phone = data['phone']
        if 'billing_address' in data:
            client.billing_address = data['billing_address']
        if 'invoice_preferences' in data:
            client.invoice_preferences = data['invoice_preferences']
        if 'default_currency' in data:
            client.default_currency = data['default_currency']
        if 'status' in data:
            client.status = data['status']
        
        # Update GST information
        if 'gst_registered' in data:
            client.gst_registered = data['gst_registered']
            if data['gst_registered'] and data.get('gst_number'):
                if not validate_gst_number(data['gst_number']):
                    return jsonify({'error': 'Invalid GST number format'}), 400
                client.gst_number = data['gst_number']
            elif not data['gst_registered']:
                client.gst_number = None
        
        # Update AWS account IDs
        if 'aws_account_ids' in data:
            client.set_aws_account_ids(data['aws_account_ids'])
        
        # Update AWS mappings
        if 'aws_mappings' in data:
            # Delete existing mappings
            ClientAwsMapping.query.filter_by(client_id=client_id).delete()
            
            # Add new mappings
            for mapping in data['aws_mappings']:
                aws_mapping = ClientAwsMapping(
                    client_id=client_id,
                    aws_account_id=mapping['aws_account_id'],
                    billing_tag_key=mapping.get('billing_tag_key'),
                    billing_tag_value=mapping.get('billing_tag_value')
                )
                db.session.add(aws_mapping)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_client', f"Updated client: {client.client_name}")
        
        return jsonify({
            'message': 'Client updated successfully',
            'client': client.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update client error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:client_id>', methods=['DELETE'])
@require_permission('Clients', 'delete')
def delete_client(client_id):
    """Delete client (Super Admin only)"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        client = Client.query.get_or_404(client_id)
        
        # Check if client has invoices
        if client.invoices:
            return jsonify({'error': 'Cannot delete client with existing invoices'}), 400
        
        db.session.delete(client)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_client', f"Deleted client: {client.client_name}")
        
        return jsonify({'message': 'Client deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete client error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:client_id>/aws', methods=['GET'])
@require_permission('Clients', 'view')
def get_client_aws_mappings(client_id):
    """Get AWS account mappings for a client"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        client = Client.query.get_or_404(client_id)
        
        # Check if Client Manager has access to this client
        if current_user.role.role_name == 'Client Manager':
            if current_user not in client.assigned_managers:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'aws_account_ids': client.get_aws_account_ids(),
            'aws_mappings': [mapping.to_dict() for mapping in client.aws_mappings]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get client AWS mappings error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:client_id>/assign', methods=['POST'])
@require_permission('Clients', 'edit')
def assign_client_manager(client_id):
    """Assign client to a manager (Super Admin only)"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        client = Client.query.get_or_404(client_id)
        data = request.get_json()
        
        if not data.get('user_id'):
            return jsonify({'error': 'user_id is required'}), 400
        
        from app.models import User
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.role.role_name != 'Client Manager':
            return jsonify({'error': 'User must be a Client Manager'}), 400
        
        # Add assignment if not already assigned
        if user not in client.assigned_managers:
            client.assigned_managers.append(user)
            db.session.commit()
            
            log_user_action(current_user.user_id, 'assign_client', 
                          f"Assigned client {client.client_name} to {user.username}")
        
        return jsonify({'message': 'Client assigned successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Assign client manager error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:client_id>/unassign', methods=['POST'])
@require_permission('Clients', 'edit')
def unassign_client_manager(client_id):
    """Unassign client from a manager (Super Admin only)"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        client = Client.query.get_or_404(client_id)
        data = request.get_json()
        
        if not data.get('user_id'):
            return jsonify({'error': 'user_id is required'}), 400
        
        from app.models import User
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove assignment if exists
        if user in client.assigned_managers:
            client.assigned_managers.remove(user)
            db.session.commit()
            
            log_user_action(current_user.user_id, 'unassign_client', 
                          f"Unassigned client {client.client_name} from {user.username}")
        
        return jsonify({'message': 'Client unassigned successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unassign client manager error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500