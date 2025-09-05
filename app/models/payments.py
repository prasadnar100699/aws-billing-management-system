from datetime import datetime
from app import db

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    
    # Payment details
    payment_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    payment_method = db.Column(db.String(50))  # Bank Transfer, Check, Online, etc.
    
    # Transaction details
    transaction_id = db.Column(db.String(100))
    reference_number = db.Column(db.String(100))
    bank_details = db.Column(db.Text)
    
    # Status and verification
    status = db.Column(db.String(20), default='Received')  # Received, Verified, Bounced
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    verification_date = db.Column(db.DateTime)
    
    # Metadata
    notes = db.Column(db.Text)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    recorder = db.relationship('User', foreign_keys=[recorded_by], backref='recorded_payments', lazy='select')
    verifier = db.relationship('User', foreign_keys=[verified_by], backref='verified_payments', lazy='select')
    
    @property
    def is_verified(self):
        """Check if payment is verified."""
        return self.status == 'Verified'
    
    def to_dict(self):
        """Convert payment to dictionary."""
        return {
            'id': self.id,
            'invoice_number': self.invoice.invoice_number if self.invoice else None,
            'client_name': self.client.name if self.client else None,
            'payment_date': self.payment_date.isoformat(),
            'amount': float(self.amount),
            'currency': self.currency,
            'payment_method': self.payment_method,
            'transaction_id': self.transaction_id,
            'reference_number': self.reference_number,
            'status': self.status,
            'recorded_by': self.recorder.full_name if self.recorder else None,
            'verified_by': self.verifier.full_name if self.verifier else None,
            'verification_date': self.verification_date.isoformat() if self.verification_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Payment {self.amount} {self.currency}>'