from app.models import AuditLog
from app import db
from flask import request
import json

def log_user_action(user_id, action, details=None, ip_address=None, user_agent=None):
    """Log user action for audit trail"""
    try:
        # Get IP address and user agent from request if not provided
        if not ip_address and request:
            ip_address = request.remote_addr
        if not user_agent and request:
            user_agent = request.headers.get('User-Agent', '')[:255]  # Limit length
        
        # Convert details to string if it's a dict
        if isinstance(details, dict):
            details = json.dumps(details)
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
    except Exception as e:
        # Don't let audit logging break the main functionality
        db.session.rollback()
        print(f"Audit logging error: {str(e)}")