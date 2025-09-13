import jwt
from datetime import datetime, timedelta
from flask import current_app
from functools import wraps
from flask_login import current_user

def generate_jwt_token(user_id):
    """Generate JWT token for user"""
    from app.models import User
    user = User.query.get(user_id)
    if not user:
        return None
        
    payload = {
        'user_id': user_id,
        'email': user.email,
        'role_name': user.role.role_name,
        'exp': datetime.utcnow() + timedelta(seconds=current_app.config['JWT_ACCESS_TOKEN_EXPIRES']),
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

def decode_jwt_token(token):
    """Decode JWT token and return user_id"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_permission(module_name, action):
    """Decorator to require specific permission"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                from flask import jsonify
                return jsonify({'error': 'Authentication required'}), 401
                
            if not current_user.has_permission(module_name, action):
                from flask import jsonify
                return jsonify({'error': 'Insufficient permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator