from flask import Blueprint, request, render_template, redirect, url_for, flash, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.users import User
from app.models.services import Service
from app.models.audit_log import AuditLog

services_bp = Blueprint('services', __name__)

@services_bp.route('/')
@jwt_required()
def list_services():
    """List all services."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    category = request.args.get('category', '')
    search = request.args.get('search', '')
    
    query = Service.query
    
    # Apply filters
    if category:
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Service.name.contains(search))
    
    services = query.filter_by(is_active=True)\
        .order_by(Service.category, Service.name)\
        .paginate(page=page, per_page=20, error_out=False)
    
    # Get categories for filter
    categories = db.session.query(Service.category)\
        .filter_by(is_active=True)\
        .distinct()\
        .all()
    categories = [cat[0] for cat in categories]
    
    if request.is_json:
        return jsonify({
            'services': [service.to_dict() for service in services.items],
            'total': services.total,
            'pages': services.pages,
            'current_page': page,
            'categories': categories
        })
    
    return render_template('services/list.html', 
                         services=services, 
                         categories=categories,
                         selected_category=category,
                         search=search)

@services_bp.route('/create', methods=['GET', 'POST'])
@jwt_required()
def create_service():
    """Create new service."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Only super admin and client managers can create services
    if not (user.is_super_admin or user.is_client_manager):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('services.list_services'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        try:
            service = Service(
                name=data.get('name'),
                description=data.get('description'),
                category=data.get('category'),
                pricing_model=data.get('pricing_model', 'hourly'),
                usd_rate=float(data.get('usd_rate', 0)) if data.get('usd_rate') else None,
                inr_rate=float(data.get('inr_rate', 0)) if data.get('inr_rate') else None,
                unit=data.get('unit', 'hour')
            )
            
            db.session.add(service)
            db.session.commit()
            
            # Log creation
            AuditLog.log_action(
                user_id=user_id,
                action='create',
                resource_type='service',
                resource_id=service.id,
                new_values=service.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Service created successfully', 'service': service.to_dict()}), 201
            
            flash('Service created successfully', 'success')
            return redirect(url_for('services.view_service', service_id=service.id))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to create service: {str(e)}'}), 400
            flash(f'Failed to create service: {str(e)}', 'error')
    
    return render_template('services/create.html')

@services_bp.route('/<int:service_id>')
@jwt_required()
def view_service(service_id):
    """View service details."""
    user_id = get_jwt_identity()
    
    service = Service.query.get_or_404(service_id)
    
    # Log access
    AuditLog.log_action(
        user_id=user_id,
        action='read',
        resource_type='service',
        resource_id=service_id
    )
    
    if request.is_json:
        return jsonify({'service': service.to_dict()})
    
    return render_template('services/view.html', service=service)

@services_bp.route('/<int:service_id>/edit', methods=['GET', 'POST'])
@jwt_required()
def edit_service(service_id):
    """Edit service."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    service = Service.query.get_or_404(service_id)
    
    # Only super admin and client managers can edit services
    if not (user.is_super_admin or user.is_client_manager):
        if request.is_json:
            return jsonify({'error': 'Insufficient permissions'}), 403
        flash('Insufficient permissions', 'error')
        return redirect(url_for('services.view_service', service_id=service_id))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        # Store old values for audit log
        old_values = service.to_dict()
        
        try:
            service.name = data.get('name', service.name)
            service.description = data.get('description', service.description)
            service.category = data.get('category', service.category)
            service.pricing_model = data.get('pricing_model', service.pricing_model)
            service.usd_rate = float(data.get('usd_rate', 0)) if data.get('usd_rate') else None
            service.inr_rate = float(data.get('inr_rate', 0)) if data.get('inr_rate') else None
            service.unit = data.get('unit', service.unit)
            
            db.session.commit()
            
            # Log update
            AuditLog.log_action(
                user_id=user_id,
                action='update',
                resource_type='service',
                resource_id=service_id,
                old_values=old_values,
                new_values=service.to_dict()
            )
            
            if request.is_json:
                return jsonify({'message': 'Service updated successfully', 'service': service.to_dict()})
            
            flash('Service updated successfully', 'success')
            return redirect(url_for('services.view_service', service_id=service_id))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': f'Failed to update service: {str(e)}'}), 400
            flash(f'Failed to update service: {str(e)}', 'error')
    
    return render_template('services/edit.html', service=service)

@services_bp.route('/<int:service_id>/deactivate', methods=['POST'])
@jwt_required()
def deactivate_service(service_id):
    """Deactivate service."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    service = Service.query.get_or_404(service_id)
    
    # Only super admin can deactivate services
    if not user.is_super_admin:
        if request.is_json:
            return jsonify({'error': 'Only super admin can deactivate services'}), 403
        flash('Only super admin can deactivate services', 'error')
        return redirect(url_for('services.view_service', service_id=service_id))
    
    try:
        service.is_active = False
        db.session.commit()
        
        # Log deactivation
        AuditLog.log_action(
            user_id=user_id,
            action='update',
            resource_type='service',
            resource_id=service_id,
            old_values={'is_active': True},
            new_values={'is_active': False}
        )
        
        if request.is_json:
            return jsonify({'message': 'Service deactivated successfully'})
        
        flash('Service deactivated successfully', 'success')
        
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'error': f'Failed to deactivate service: {str(e)}'}), 400
        flash(f'Failed to deactivate service: {str(e)}', 'error')
    
    return redirect(url_for('services.list_services'))

@services_bp.route('/api/services')
@jwt_required()
def api_services():
    """API endpoint to get services for AJAX calls."""
    category = request.args.get('category')
    
    query = Service.query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)
    
    services = query.order_by(Service.name).all()
    
    return jsonify([{
        'id': service.id,
        'name': service.name,
        'description': service.description,
        'usd_rate': float(service.usd_rate) if service.usd_rate else None,
        'inr_rate': float(service.inr_rate) if service.inr_rate else None,
        'unit': service.unit,
        'pricing_model': service.pricing_model
    } for service in services])