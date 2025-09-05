from datetime import datetime
from app import db

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Notification details
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # info, warning, error, success
    category = db.Column(db.String(50))  # invoice, payment, system, etc.
    
    # Status
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    
    # Related records
    related_type = db.Column(db.String(50))  # invoice, client, payment, etc.
    related_id = db.Column(db.Integer)
    
    # Actions
    action_url = db.Column(db.String(500))
    action_text = db.Column(db.String(100))
    
    # Priority and scheduling
    priority = db.Column(db.String(10), default='normal')  # low, normal, high, urgent
    scheduled_for = db.Column(db.DateTime)  # For scheduled notifications
    expires_at = db.Column(db.DateTime)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.is_read = True
        self.read_at = datetime.utcnow()
    
    @property
    def is_expired(self):
        """Check if notification is expired."""
        if self.expires_at:
            return self.expires_at < datetime.utcnow()
        return False
    
    @property
    def age_in_days(self):
        """Get notification age in days."""
        return (datetime.utcnow() - self.created_at).days
    
    @staticmethod
    def create_notification(user_id, title, message, notification_type='info', 
                          category=None, related_type=None, related_id=None,
                          action_url=None, action_text=None, priority='normal'):
        """Create a new notification."""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            category=category,
            related_type=related_type,
            related_id=related_id,
            action_url=action_url,
            action_text=action_text,
            priority=priority
        )
        
        db.session.add(notification)
        return notification
    
    def to_dict(self):
        """Convert notification to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type,
            'category': self.category,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'related_type': self.related_type,
            'related_id': self.related_id,
            'action_url': self.action_url,
            'action_text': self.action_text,
            'priority': self.priority,
            'age_in_days': self.age_in_days,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Notification {self.title}>'