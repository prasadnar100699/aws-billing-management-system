from flask import request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app.auth import bp
from app.models import User, Role, AuditLog
from app import db
from app.utils.auth import generate_jwt_token, decode_jwt_token
from app.utils.audit import log_user_action
from datetime import datetime

@bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            log_user_action(None, 'login_failed', f"Failed login attempt for {data['email']}")
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if user.status != 'active':
            return jsonify({'error': 'Account is inactive'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.user_id, user.email, user.role.role_name)
        
        # Log successful login
        login_user(user)
        log_user_action(user.user_id, 'login_success', f"User logged in successfully")
        
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role_name': user.role.role_name,
            'role_id': user.role_id,
            'token': token,
            'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/demo-credentials', methods=['GET'])
def get_demo_credentials():
    """Get demo credentials for testing"""
    try:
        # Get all users with their roles
        users = db.session.query(User, Role).join(Role).all()
        
        credentials = []
        for user, role in users:
            # Map role to icon and color
            role_config = {
                'Super Admin': {'icon': 'Shield', 'color': 'bg-blue-500'},
                'Client Manager': {'icon': 'Users', 'color': 'bg-green-500'},
                'Auditor': {'icon': 'BarChart3', 'color': 'bg-purple-500'}
            }
            
            config = role_config.get(role.role_name, {'icon': 'User', 'color': 'bg-gray-500'})
            
            credentials.append({
                'role': role.role_name,
                'email': user.email,
                'password': 'password123',  # Demo password
                'description': role.description,
                'icon': config['icon'],
                'color': config['color']
            })
        
        return jsonify({'credentials': credentials}), 200
        
    except Exception as e:
        current_app.logger.error(f"Get demo credentials error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout user and clear session"""
    try:
        log_user_action(current_user.user_id, 'logout', "User logged out")
        logout_user()
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user details"""
    try:
        permissions = {}
        for access in current_user.role.module_access:
            permissions[access.module_name] = {
                'can_view': access.can_view,
                'can_create': access.can_create,
                'can_edit': access.can_edit,
                'can_delete': access.can_delete
            }
        
        return jsonify({
            'user': current_user.to_dict(),
            'permissions': permissions
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/verify', methods=['POST'])
def verify_token():
    """Verify JWT token validity"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = decode_jwt_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.query.get(payload.get('user_id'))
        if not user or user.status != 'active':
            return jsonify({'error': 'Invalid user'}), 401
        
        return jsonify({
            'valid': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500