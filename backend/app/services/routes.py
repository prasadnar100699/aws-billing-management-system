from flask import request, jsonify, current_app
from app.services import bp
from app.models import Service, ServiceCategory, PricingComponent
from app import db
from app.utils.auth import require_permission
from app.utils.audit import log_user_action
from sqlalchemy import or_

@bp.route('/categories', methods=['POST'])
@require_permission('Services', 'create')
def create_category():
    """Create a new service category (Super Admin only)"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        data = request.get_json()
        
        if not data.get('category_name'):
            return jsonify({'error': 'category_name is required'}), 400
        
        # Check if category already exists
        if ServiceCategory.query.filter_by(category_name=data['category_name']).first():
            return jsonify({'error': 'Category already exists'}), 409
        
        category = ServiceCategory(
            category_name=data['category_name'],
            description=data.get('description', '')
        )
        
        db.session.add(category)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_category', f"Created category: {category.category_name}")
        
        return jsonify({
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create category error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/categories', methods=['GET'])
@require_permission('Services', 'view')
def list_categories():
    """List all service categories"""
    try:
        categories = ServiceCategory.query.all()
        categories_data = [category.to_dict() for category in categories]
        
        return jsonify({'categories': categories_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"List categories error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['POST'])
@require_permission('Services', 'create')
def create_service():
    """Create a new service (Super Admin only)"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['service_name', 'service_category_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate category exists
        category = ServiceCategory.query.get(data['service_category_id'])
        if not category:
            return jsonify({'error': 'Invalid service_category_id'}), 400
        
        # Check if service already exists
        if Service.query.filter_by(service_name=data['service_name']).first():
            return jsonify({'error': 'Service already exists'}), 409
        
        service = Service(
            service_name=data['service_name'],
            service_category_id=data['service_category_id'],
            aws_service_code=data.get('aws_service_code'),
            description=data.get('description', ''),
            status=data.get('status', 'active')
        )
        
        db.session.add(service)
        db.session.flush()  # Get the service_id
        
        # Add pricing components if provided
        components = data.get('pricing_components', [])
        for comp_data in components:
            component = PricingComponent(
                service_id=service.service_id,
                component_name=comp_data['component_name'],
                metric_type=comp_data['metric_type'],
                unit=comp_data['unit'],
                rate=comp_data['rate'],
                billing_method=comp_data.get('billing_method', 'per_unit'),
                currency=comp_data.get('currency', 'USD')
            )
            
            if comp_data.get('tier_rules'):
                component.set_tier_rules(comp_data['tier_rules'])
            
            db.session.add(component)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_service', f"Created service: {service.service_name}")
        
        return jsonify({
            'message': 'Service created successfully',
            'service': service.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create service error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['GET'])
@require_permission('Services', 'view')
def list_services():
    """List services with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'service_name')
        search = request.args.get('search', '')
        category_id = request.args.get('category_id', type=int)
        status = request.args.get('status')
        
        # Build query
        query = Service.query
        
        # Apply search filter
        if search:
            query = query.filter(or_(
                Service.service_name.contains(search),
                Service.aws_service_code.contains(search),
                Service.description.contains(search)
            ))
        
        # Apply category filter
        if category_id:
            query = query.filter(Service.service_category_id == category_id)
        
        # Apply status filter
        if status:
            query = query.filter(Service.status == status)
        
        # Apply sorting
        if sort == 'service_name':
            query = query.order_by(Service.service_name)
        elif sort == 'category':
            query = query.join(ServiceCategory).order_by(ServiceCategory.category_name)
        elif sort == 'created_at':
            query = query.order_by(Service.created_at.desc())
        else:
            query = query.order_by(Service.service_name)
        
        # Paginate results
        services = query.paginate(page=page, per_page=limit, error_out=False)
        
        result = {
            'services': [service.to_dict() for service in services.items],
            'total': services.total,
            'pages': services.pages,
            'current_page': page,
            'per_page': limit
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"List services error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:service_id>', methods=['GET'])
@require_permission('Services', 'view')
def get_service(service_id):
    """Get service details with pricing components"""
    try:
        service = Service.query.get_or_404(service_id)
        
        return jsonify({
            'service': service.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get service error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:service_id>', methods=['PUT'])
@require_permission('Services', 'edit')
def update_service(service_id):
    """Update service details"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        service = Service.query.get_or_404(service_id)
        data = request.get_json()
        
        # Update basic fields
        if 'service_name' in data:
            service.service_name = data['service_name']
        if 'service_category_id' in data:
            category = ServiceCategory.query.get(data['service_category_id'])
            if not category:
                return jsonify({'error': 'Invalid service_category_id'}), 400
            service.service_category_id = data['service_category_id']
        if 'aws_service_code' in data:
            service.aws_service_code = data['aws_service_code']
        if 'description' in data:
            service.description = data['description']
        if 'status' in data:
            service.status = data['status']
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_service', f"Updated service: {service.service_name}")
        
        return jsonify({
            'message': 'Service updated successfully',
            'service': service.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update service error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:service_id>', methods=['DELETE'])
@require_permission('Services', 'delete')
def delete_service(service_id):
    """Delete service if not used in any invoices"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        service = Service.query.get_or_404(service_id)
        
        # Check if service is used in any invoice line items
        from app.models import InvoiceLineItem
        if InvoiceLineItem.query.join(PricingComponent).filter(PricingComponent.service_id == service_id).first():
            return jsonify({'error': 'Cannot delete service that is used in invoices'}), 400
        
        db.session.delete(service)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_service', f"Deleted service: {service.service_name}")
        
        return jsonify({'message': 'Service deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete service error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Pricing Components endpoints
@bp.route('/<int:service_id>/components', methods=['POST'])
@require_permission('Services', 'create')
def create_pricing_component(service_id):
    """Add pricing component to service"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        service = Service.query.get_or_404(service_id)
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['component_name', 'metric_type', 'unit', 'rate']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        component = PricingComponent(
            service_id=service_id,
            component_name=data['component_name'],
            metric_type=data['metric_type'],
            unit=data['unit'],
            rate=data['rate'],
            billing_method=data.get('billing_method', 'per_unit'),
            currency=data.get('currency', 'USD'),
            status=data.get('status', 'active')
        )
        
        if data.get('tier_rules'):
            component.set_tier_rules(data['tier_rules'])
        
        db.session.add(component)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_component', 
                       f"Created component: {component.component_name} for service: {service.service_name}")
        
        return jsonify({
            'message': 'Pricing component created successfully',
            'component': component.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create pricing component error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:service_id>/components', methods=['GET'])
@require_permission('Services', 'view')
def list_pricing_components(service_id):
    """List pricing components for a service"""
    try:
        service = Service.query.get_or_404(service_id)
        
        components = PricingComponent.query.filter_by(service_id=service_id).all()
        
        return jsonify({
            'components': [component.to_dict() for component in components]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List pricing components error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/components/<int:component_id>', methods=['GET'])
@require_permission('Services', 'view')
def get_pricing_component(component_id):
    """Get pricing component details"""
    try:
        component = PricingComponent.query.get_or_404(component_id)
        
        return jsonify({
            'component': component.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get pricing component error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/components/<int:component_id>', methods=['PUT'])
@require_permission('Services', 'edit')
def update_pricing_component(component_id):
    """Update pricing component"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        component = PricingComponent.query.get_or_404(component_id)
        data = request.get_json()
        
        # Update fields
        if 'component_name' in data:
            component.component_name = data['component_name']
        if 'metric_type' in data:
            component.metric_type = data['metric_type']
        if 'unit' in data:
            component.unit = data['unit']
        if 'rate' in data:
            component.rate = data['rate']
        if 'billing_method' in data:
            component.billing_method = data['billing_method']
        if 'currency' in data:
            component.currency = data['currency']
        if 'status' in data:
            component.status = data['status']
        if 'tier_rules' in data:
            component.set_tier_rules(data['tier_rules'])
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_component', 
                       f"Updated component: {component.component_name}")
        
        return jsonify({
            'message': 'Pricing component updated successfully',
            'component': component.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update pricing component error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/components/<int:component_id>', methods=['DELETE'])
@require_permission('Services', 'delete')
def delete_pricing_component(component_id):
    """Delete pricing component if not used"""
    try:
        from app.utils.auth import get_current_user
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
            
        component = PricingComponent.query.get_or_404(component_id)
        
        # Check if component is used in any invoice line items
        if component.line_items:
            return jsonify({'error': 'Cannot delete component that is used in invoices'}), 400
        
        db.session.delete(component)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_component', 
                       f"Deleted component: {component.component_name}")
        
        return jsonify({'message': 'Pricing component deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete pricing component error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500