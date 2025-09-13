from functools import wraps
from flask import request, jsonify

def get_current_user():
    """Get current user from session/request"""
    from app.models import User
    
    # Simple session-based auth using email header
    email = request.headers.get('X-User-Email')
    if not email:
        return None
    
    user = User.query.filter_by(email=email).first()
    return user if user and user.status.value == 'active' else None

def require_permission(module_name, action):
    """Decorator to require specific permission"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = get_current_user()
            if not current_user:
                return jsonify({'error': 'Authentication required'}), 401
                
            if not current_user.has_permission(module_name, action):
                return jsonify({'error': 'Insufficient permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator