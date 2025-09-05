from datetime import datetime
from app import db

class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    company_name = db.Column(db.String(200))
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    
    # Address
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))
    country = db.Column(db.String(100), default='India')
    
    # Business details
    gst_number = db.Column(db.String(15))  # Optional GST
    currency_preference = db.Column(db.String(3), default='INR')  # USD/INR
    invoice_template = db.Column(db.String(50), default='standard')
    payment_terms = db.Column(db.Integer, default=30)  # Days
    
    # Manager assignment
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Status and metadata
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = db.Column(db.Text)
    
    # Relationships
    invoices = db.relationship('Invoice', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    documents = db.relationship('Document', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='client', lazy='dynamic')
    
    @property
    def full_address(self):
        """Get formatted full address."""
        address_parts = []
        if self.address_line1:
            address_parts.append(self.address_line1)
        if self.address_line2:
            address_parts.append(self.address_line2)
        if self.city:
            address_parts.append(self.city)
        if self.state:
            address_parts.append(self.state)
        if self.postal_code:
            address_parts.append(self.postal_code)
        if self.country:
            address_parts.append(self.country)
        return ', '.join(address_parts)
    
    @property
    def total_billed(self):
        """Get total amount billed to this client."""
        return sum(invoice.total_amount for invoice in self.invoices if invoice.status != 'Draft')
    
    @property
    def outstanding_amount(self):
        """Get outstanding amount for this client."""
        total_invoiced = sum(invoice.total_amount for invoice in self.invoices if invoice.status in ['Sent', 'Overdue'])
        total_paid = sum(payment.amount for payment in self.payments)
        return total_invoiced - total_paid
    
    def to_dict(self):
        """Convert client to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'company_name': self.company_name,
            'email': self.email,
            'phone': self.phone,
            'full_address': self.full_address,
            'gst_number': self.gst_number,
            'currency_preference': self.currency_preference,
            'manager': self.manager.full_name if self.manager else None,
            'is_active': self.is_active,
            'total_billed': self.total_billed,
            'outstanding_amount': self.outstanding_amount,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Client {self.name}>'