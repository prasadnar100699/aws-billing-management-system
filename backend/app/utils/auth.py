import jwt
from datetime import datetime, timedelta
from flask import current_app

def generate_jwt_token(user_id, email, role_name):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'role_name': role_name,
        'exp': datetime.utcnow() + timedelta(seconds=current_app.config['JWT_ACCESS_TOKEN_EXPIRES']),
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

def decode_jwt_token(token):
    """Decode JWT token and return payload"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None