from flask import request, jsonify, current_app
from app.auth import bp
from app.models import User, Role, AuditLog
from app import db
from app.utils.audit import log_user_action
from datetime import datetime

@bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return user data"""
    try:
        data = request.get_json()
       
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
       
        user = User.query.filter_by(email=data['email']).first()
       
        if not user or not user.check_password(data['password']):
            log_user_action(None, 'login_failed', f"Failed login attempt for {data['email']}")
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if user.status.value != 'active':
            return jsonify({'error': 'Account is inactive'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        log_user_action(user.user_id, 'login_success', f"User logged in successfully")
        
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role': user.role.role_name,
            'role_id': user.role_id,
            'status': user.status.value
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    try:
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user details"""
    try:
        # Get user from email in request (simplified auth)
        email = request.headers.get('X-User-Email')
        if not email:
            return jsonify({'error': 'User email required'}), 401
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        permissions = {}
        for access in user.role.module_access:
            permissions[access.module_name] = {
                'can_view': access.can_view,
                'can_create': access.can_create,
                'can_edit': access.can_edit,
                'can_delete': access.can_delete
            }
        
        return jsonify({
            'user': user.to_dict(),
            'permissions': permissions
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500