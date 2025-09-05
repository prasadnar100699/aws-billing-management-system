from datetime import datetime
from app import db

class EmailLog(db.Model):
    __tablename__ = 'email_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Email details
    to_email = db.Column(db.String(255), nullable=False)
    from_email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(500), nullable=False)
    
    # Content
    email_type = db.Column(db.String(50), nullable=False)  # invoice, notification, reminder, etc.
    template_used = db.Column(db.String(100))
    
    # Related records
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'))
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Delivery status
    status = db.Column(db.String(20), default='pending')  # pending, sent, failed, bounced
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    opened_at = db.Column(db.DateTime)
    clicked_at = db.Column(db.DateTime)
    
    # Error tracking
    error_message = db.Column(db.Text)
    retry_count = db.Column(db.Integer, default=0)
    max_retries = db.Column(db.Integer, default=3)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    invoice = db.relationship('Invoice', backref='email_logs', lazy='select')
    client = db.relationship('Client', backref='email_logs', lazy='select')
    user = db.relationship('User', backref='email_logs', lazy='select')
    
    @property
    def can_retry(self):
        """Check if email can be retried."""
        return self.status == 'failed' and self.retry_count < self.max_retries
    
    def mark_sent(self):
        """Mark email as sent."""
        self.status = 'sent'
        self.sent_at = datetime.utcnow()
    
    def mark_failed(self, error_message):
        """Mark email as failed."""
        self.status = 'failed'
        self.error_message = error_message
        self.retry_count += 1
    
    def mark_delivered(self):
        """Mark email as delivered."""
        self.delivered_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert email log to dictionary."""
        return {
            'id': self.id,
            'to_email': self.to_email,
            'from_email': self.from_email,
            'subject': self.subject,
            'email_type': self.email_type,
            'invoice_number': self.invoice.invoice_number if self.invoice else None,
            'client_name': self.client.name if self.client else None,
            'status': self.status,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'error_message': self.error_message,
            'retry_count': self.retry_count,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<EmailLog {self.email_type} to {self.to_email}>'