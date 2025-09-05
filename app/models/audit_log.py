from datetime import datetime
from app import db
import json

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Action details
    action = db.Column(db.String(100), nullable=False)  # create, read, update, delete
    resource_type = db.Column(db.String(50), nullable=False)  # invoice, client, user, etc.
    resource_id = db.Column(db.Integer)
    
    # Request details
    ip_address = db.Column(db.String(45))  # Supports IPv6
    user_agent = db.Column(db.String(500))
    request_method = db.Column(db.String(10))
    request_url = db.Column(db.String(500))
    
    # Change tracking
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    
    # Status and metadata
    status = db.Column(db.String(20), default='success')  # success, failed, unauthorized
    error_message = db.Column(db.Text)
    session_id = db.Column(db.String(100))
    
    # Timing
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    @staticmethod
    def log_action(user_id, action, resource_type, resource_id=None, 
                   old_values=None, new_values=None, status='success', 
                   error_message=None, request_data=None):
        """Log an action to the audit trail."""
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            status=status,
            error_message=error_message
        )
        
        if request_data:
            log_entry.ip_address = request_data.get('ip_address')
            log_entry.user_agent = request_data.get('user_agent')
            log_entry.request_method = request_data.get('method')
            log_entry.request_url = request_data.get('url')
            log_entry.session_id = request_data.get('session_id')
        
        db.session.add(log_entry)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            # Log to system logger if database logging fails
            print(f"Failed to log audit entry: {e}")
    
    @property
    def description(self):
        """Generate human-readable description of the action."""
        descriptions = {
            'create': f"Created {self.resource_type}",
            'read': f"Viewed {self.resource_type}",
            'update': f"Updated {self.resource_type}",
            'delete': f"Deleted {self.resource_type}",
            'login': "Logged in",
            'logout': "Logged out",
            'password_change': "Changed password",
            'role_change': "Role changed",
            'export': f"Exported {self.resource_type} data",
            'email_sent': f"Sent email for {self.resource_type}"
        }
        
        desc = descriptions.get(self.action, f"Performed {self.action} on {self.resource_type}")
        if self.resource_id:
            desc += f" (ID: {self.resource_id})"
        return desc
    
    def to_dict(self):
        """Convert audit log to dictionary."""
        return {
            'id': self.id,
            'user_name': self.user.full_name if self.user else 'System',
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'description': self.description,
            'ip_address': self.ip_address,
            'status': self.status,
            'error_message': self.error_message,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'timestamp': self.timestamp.isoformat()
        }
    
    def __repr__(self):
        return f'<AuditLog {self.action} {self.resource_type}>'