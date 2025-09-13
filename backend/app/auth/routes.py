from flask import request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app.auth import bp
from app.models import User, AuditLog
from app import db
from app.utils.auth import generate_jwt_token, decode_jwt_token
from app.utils.audit import log_user_action
import jwt
from datetime import datetime, timedelta

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
        
        if user.status.value != 'active':
            return jsonify({'error': 'Account is inactive'}), 401
        
        # Generate JWT token
        token = generate_jwt_token(user.user_id)
        
        # Log successful login
        login_user(user)
        log_user_action(user.user_id, 'login_success', f"User logged in successfully")
        
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role': user.role.role_name,
            'role_id': user.role_id,
            'token': token,
            'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
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
        return jsonify({
            'user': current_user.to_dict(),
            'permissions': {
                access.module_name: {
                    'can_view': access.can_view,
                    'can_create': access.can_create,
                    'can_edit': access.can_edit,
                    'can_delete': access.can_delete
                } for access in current_user.role.module_access
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh JWT token"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Decode token (even if expired)
            payload = jwt.decode(
                token, 
                current_app.config['JWT_SECRET_KEY'], 
                algorithms=['HS256'],
                options={"verify_exp": False}
            )
            
            user_id = payload.get('user_id')
            user = User.query.get(user_id)
            
            if not user or user.status.value != 'active':
                return jsonify({'error': 'Invalid user'}), 401
            
            # Generate new token
            new_token = generate_jwt_token(user.user_id)
            
            return jsonify({
                'token': new_token,
                'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
            }), 200
            
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
            
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/verify', methods=['POST'])
def verify_token():
    """Verify JWT token validity"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = decode_jwt_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.query.get(user_id)
        if not user or user.status.value != 'active':
            return jsonify({'error': 'Invalid user'}), 401
        
        return jsonify({
            'valid': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500