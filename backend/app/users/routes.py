from flask import request, jsonify, current_app
from flask_login import login_required, current_user
from app.users import bp
from app.models import User, Role, AuditLog
from app import db
from app.utils.auth import require_permission
from app.utils.audit import log_user_action
from app.utils.validation import validate_email, validate_password
from sqlalchemy import or_

@bp.route('/', methods=['POST'])
@login_required
@require_permission('Users', 'create')
def create_user():
    """Create a new user (Super Admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'role_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        password_error = validate_password(data['password'])
        if password_error:
            return jsonify({'error': password_error}), 400
        
        # Check if user already exists
        if User.query.filter(or_(User.email == data['email'], User.username == data['username'])).first():
            return jsonify({'error': 'User with this email or username already exists'}), 409
        
        # Validate role exists
        role = Role.query.get(data['role_id'])
        if not role:
            return jsonify({'error': 'Invalid role_id'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            role_id=data['role_id'],
            status=data.get('status', 'active')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_user', f"Created user: {user.username}")
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/', methods=['GET'])
@login_required
@require_permission('Users', 'view')
def list_users():
    """List users with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        sort = request.args.get('sort', 'username')
        search = request.args.get('search', '')
        role_id = request.args.get('role_id', type=int)
        status = request.args.get('status')
        
        # Build query
        query = User.query
        
        # Apply search filter
        if search:
            query = query.filter(or_(
                User.username.contains(search),
                User.email.contains(search)
            ))
        
        # Apply role filter
        if role_id:
            query = query.filter(User.role_id == role_id)
        
        # Apply status filter
        if status:
            query = query.filter(User.status == status)
        
        # Apply sorting
        if sort == 'username':
            query = query.order_by(User.username)
        elif sort == 'email':
            query = query.order_by(User.email)
        elif sort == 'created_at':
            query = query.order_by(User.created_at.desc())
        else:
            query = query.order_by(User.username)
        
        # For Client Managers, only show themselves
        if current_user.role.role_name == 'Client Manager':
            query = query.filter(User.user_id == current_user.user_id)
        
        # Paginate results
        users = query.paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': page,
            'per_page': limit
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List users error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:user_id>', methods=['GET'])
@login_required
@require_permission('Users', 'view')
def get_user(user_id):
    """Get user details"""
    try:
        # Client Managers can only view themselves
        if current_user.role.role_name == 'Client Manager' and user_id != current_user.user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get_or_404(user_id)
        
        return jsonify({
            'user': user.to_dict(),
            'assigned_clients': [client.to_dict() for client in user.assigned_clients]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:user_id>', methods=['PUT'])
@login_required
@require_permission('Users', 'edit')
def update_user(user_id):
    """Update user details"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        # Validate email if provided
        if 'email' in data and data['email'] != user.email:
            if not validate_email(data['email']):
                return jsonify({'error': 'Invalid email format'}), 400
            
            # Check if email already exists
            if User.query.filter(User.email == data['email'], User.user_id != user_id).first():
                return jsonify({'error': 'Email already exists'}), 409
            
            user.email = data['email']
        
        # Update other fields
        if 'username' in data and data['username'] != user.username:
            # Check if username already exists
            if User.query.filter(User.username == data['username'], User.user_id != user_id).first():
                return jsonify({'error': 'Username already exists'}), 409
            user.username = data['username']
        
        if 'role_id' in data:
            role = Role.query.get(data['role_id'])
            if not role:
                return jsonify({'error': 'Invalid role_id'}), 400
            user.role_id = data['role_id']
        
        if 'status' in data:
            user.status = data['status']
        
        # Update password if provided
        if 'password' in data:
            password_error = validate_password(data['password'])
            if password_error:
                return jsonify({'error': password_error}), 400
            user.set_password(data['password'])
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_user', f"Updated user: {user.username}")
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:user_id>', methods=['DELETE'])
@login_required
@require_permission('Users', 'delete')
def delete_user(user_id):
    """Deactivate user (Super Admin only)"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Prevent self-deletion
        if user_id == current_user.user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        # Deactivate instead of delete
        user.status = 'inactive'
        db.session.commit()
        
        log_user_action(current_user.user_id, 'deactivate_user', f"Deactivated user: {user.username}")
        
        return jsonify({'message': 'User deactivated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Role management endpoints
@bp.route('/roles', methods=['POST'])
@login_required
@require_permission('Users', 'create')
def create_role():
    """Create a new role (Super Admin only)"""
    try:
        data = request.get_json()
        
        if not data.get('role_name'):
            return jsonify({'error': 'role_name is required'}), 400
        
        # Check if role already exists
        if Role.query.filter_by(role_name=data['role_name']).first():
            return jsonify({'error': 'Role already exists'}), 409
        
        role = Role(
            role_name=data['role_name'],
            description=data.get('description', '')
        )
        
        db.session.add(role)
        db.session.flush()  # Get the role_id
        
        # Add permissions
        from app.models import RoleModuleAccess
        permissions = data.get('permissions', {})
        for module_name, perms in permissions.items():
            access = RoleModuleAccess(
                role_id=role.role_id,
                module_name=module_name,
                can_view=perms.get('can_view', False),
                can_create=perms.get('can_create', False),
                can_edit=perms.get('can_edit', False),
                can_delete=perms.get('can_delete', False)
            )
            db.session.add(access)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'create_role', f"Created role: {role.role_name}")
        
        return jsonify({
            'message': 'Role created successfully',
            'role': role.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create role error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/roles', methods=['GET'])
@login_required
@require_permission('Users', 'view')
def list_roles():
    """List all roles with permissions"""
    try:
        roles = Role.query.all()
        return jsonify({
            'roles': [role.to_dict() for role in roles]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List roles error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/roles/<int:role_id>', methods=['GET'])
@login_required
@require_permission('Users', 'view')
def get_role(role_id):
    """Get role details"""
    try:
        role = Role.query.get_or_404(role_id)
        return jsonify({'role': role.to_dict()}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get role error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/roles/<int:role_id>', methods=['PUT'])
@login_required
@require_permission('Users', 'edit')
def update_role(role_id):
    """Update role permissions"""
    try:
        role = Role.query.get_or_404(role_id)
        data = request.get_json()
        
        # Update basic info
        if 'role_name' in data:
            role.role_name = data['role_name']
        if 'description' in data:
            role.description = data['description']
        
        # Update permissions
        if 'permissions' in data:
            from app.models import RoleModuleAccess
            
            # Delete existing permissions
            RoleModuleAccess.query.filter_by(role_id=role_id).delete()
            
            # Add new permissions
            for module_name, perms in data['permissions'].items():
                access = RoleModuleAccess(
                    role_id=role_id,
                    module_name=module_name,
                    can_view=perms.get('can_view', False),
                    can_create=perms.get('can_create', False),
                    can_edit=perms.get('can_edit', False),
                    can_delete=perms.get('can_delete', False)
                )
                db.session.add(access)
        
        db.session.commit()
        
        log_user_action(current_user.user_id, 'update_role', f"Updated role: {role.role_name}")
        
        return jsonify({
            'message': 'Role updated successfully',
            'role': role.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update role error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/roles/<int:role_id>', methods=['DELETE'])
@login_required
@require_permission('Users', 'delete')
def delete_role(role_id):
    """Delete role if not assigned to any users"""
    try:
        role = Role.query.get_or_404(role_id)
        
        # Check if role is assigned to any users
        if role.users:
            return jsonify({'error': 'Cannot delete role that is assigned to users'}), 400
        
        db.session.delete(role)
        db.session.commit()
        
        log_user_action(current_user.user_id, 'delete_role', f"Deleted role: {role.role_name}")
        
        return jsonify({'message': 'Role deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete role error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500