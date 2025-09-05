from datetime import datetime, timedelta
from app import db

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Invoice details
    invoice_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    due_date = db.Column(db.Date, nullable=False)
    
    # Financial details
    subtotal_usd = db.Column(db.Numeric(12, 2), default=0)
    subtotal_inr = db.Column(db.Numeric(12, 2), default=0)
    gst_rate = db.Column(db.Numeric(5, 2), default=18.00)
    gst_amount = db.Column(db.Numeric(12, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    currency = db.Column(db.String(3), default='INR')
    
    # Exchange rate (frozen when invoice is finalized)
    exchange_rate = db.Column(db.Numeric(8, 4))
    exchange_rate_date = db.Column(db.Date)
    
    # Status and workflow
    status = db.Column(db.String(20), default='Draft')  # Draft, Approved, Finalized, Sent, Paid, Overdue
    gst_applicable = db.Column(db.Boolean, default=True)
    
    # File and communication
    pdf_path = db.Column(db.String(500))
    email_sent = db.Column(db.Boolean, default=False)
    email_sent_date = db.Column(db.DateTime)
    
    # Metadata
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    finalized_at = db.Column(db.DateTime)
    
    # Relationships
    line_items = db.relationship('InvoiceLineItem', backref='invoice', lazy='dynamic', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='invoice', lazy='dynamic')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.due_date and self.client:
            self.due_date = self.invoice_date + timedelta(days=self.client.payment_terms)
    
    @property
    def is_overdue(self):
        return self.due_date < datetime.utcnow().date() and self.status in ['Sent', 'Finalized']
    
    @property
    def days_overdue(self):
        if self.is_overdue:
            return (datetime.utcnow().date() - self.due_date).days
        return 0
    
    @property
    def paid_amount(self):
        return sum(payment.amount for payment in self.payments)
    
    @property
    def outstanding_amount(self):
        return self.total_amount - self.paid_amount
    
    def generate_invoice_number(self):
        prefix = "TEJ"
        year = datetime.utcnow().year
        month = datetime.utcnow().month
        
        last_invoice = Invoice.query.filter(
            Invoice.invoice_number.like(f"{prefix}-{year:04d}-{month:02d}-%")
        ).order_by(Invoice.id.desc()).first()
        
        if last_invoice:
            seq = int(last_invoice.invoice_number.split('-')[-1]) + 1
        else:
            seq = 1
        
        self.invoice_number = f"{prefix}-{year:04d}-{month:02d}-{seq:04d}"
    
    def calculate_totals(self):
        self.subtotal_usd = sum(item.usd_amount for item in self.line_items if item.usd_amount)
        self.subtotal_inr = sum(item.inr_amount for item in self.line_items if item.inr_amount)
        
        if self.gst_applicable:
            if self.currency == 'USD':
                self.gst_amount = (self.subtotal_usd * self.gst_rate / 100)
                self.total_amount = self.subtotal_usd + self.gst_amount
            else:
                self.gst_amount = (self.subtotal_inr * self.gst_rate / 100)
                self.total_amount = self.subtotal_inr + self.gst_amount
        else:
            self.gst_amount = 0
            if self.currency == 'USD':
                self.total_amount = self.subtotal_usd
            else:
                self.total_amount = self.subtotal_inr
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'client_name': self.client.name if self.client else None,
            'creator_name': self.creator.full_name if self.creator else None,
            'invoice_date': self.invoice_date.isoformat(),
            'due_date': self.due_date.isoformat(),
            'subtotal_usd': float(self.subtotal_usd) if self.subtotal_usd else 0,
            'subtotal_inr': float(self.subtotal_inr) if self.subtotal_inr else 0,
            'gst_amount': float(self.gst_amount) if self.gst_amount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'currency': self.currency,
            'status': self.status,
            'is_overdue': self.is_overdue,
            'days_overdue': self.days_overdue,
            'paid_amount': float(self.paid_amount) if self.paid_amount else 0,
            'outstanding_amount': float(self.outstanding_amount) if self.outstanding_amount else 0,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'

class InvoiceLineItem(db.Model):
    __tablename__ = 'invoice_line_items'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'))  # Can be null for custom items
    
    # Line item details
    description = db.Column(db.String(500), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    unit = db.Column(db.String(20), default='hour')
    
    # Pricing
    usd_rate = db.Column(db.Numeric(10, 2))
    inr_rate = db.Column(db.Numeric(10, 2))
    usd_amount = db.Column(db.Numeric(12, 2))
    inr_amount = db.Column(db.Numeric(12, 2))
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sort_order = db.Column(db.Integer, default=0)
    
    def calculate_amounts(self):
        if self.usd_rate:
            self.usd_amount = self.quantity * self.usd_rate
        if self.inr_rate:
            self.inr_amount = self.quantity * self.inr_rate
    
    def to_dict(self):
        return {
            'id': self.id,
            'service_name': self.service.name if self.service else 'Custom',
            'description': self.description,
            'quantity': float(self.quantity),
            'unit': self.unit,
            'usd_rate': float(self.usd_rate) if self.usd_rate else None,
            'inr_rate': float(self.inr_rate) if self.inr_rate else None,
            'usd_amount': float(self.usd_amount) if self.usd_amount else None,
            'inr_amount': float(self.inr_amount) if self.inr_amount else None
        }
    
    def __repr__(self):
        return f'<InvoiceLineItem {self.description}>'
