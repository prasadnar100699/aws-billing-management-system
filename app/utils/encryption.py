from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import current_app
import base64
import os

def get_fernet_key():
    """Generate Fernet key from app config."""
    password = current_app.config['ENCRYPTION_KEY'].encode()
    salt = b'tej_it_solutions_salt_2024'  # In production, store this securely
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return Fernet(key)

def encrypt_data(data):
    """Encrypt sensitive data."""
    if not data:
        return None
    
    if isinstance(data, dict):
        import json
        data = json.dumps(data)
    
    if isinstance(data, str):
        data = data.encode()
    
    f = get_fernet_key()
    encrypted_data = f.encrypt(data)
    return encrypted_data

def decrypt_data(encrypted_data):
    """Decrypt sensitive data."""
    if not encrypted_data:
        return None
    
    f = get_fernet_key()
    decrypted_data = f.decrypt(encrypted_data)
    
    try:
        # Try to decode as JSON first
        import json
        return json.loads(decrypted_data.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        # Return as string if not JSON
        try:
            return decrypted_data.decode()
        except UnicodeDecodeError:
            return decrypted_data