from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
import enum

# ===========================
# ENUM DEFINITIONS
# ===========================
class StatusEnum(enum.Enum):
    ACTIVE = 'active'
    INACTIVE = 'inactive'

class InvoiceStatusEnum(enum.Enum):
    DRAFT = 'draft'
    APPROVED = 'approved'
    FINALIZED = 'finalized'
    SENT = 'sent'

class CurrencyEnum(enum.Enum):
    USD = 'USD'
    INR = 'INR'

class MetricTypeEnum(enum.Enum):
    USAGE = 'usage'
    REQUEST = 'request'
    DATA_TRANSFER = 'data_transfer'
    HOUR = 'hour'
    GB = 'gb'
    FIXED = 'fixed'

class BillingMethodEnum(enum.Enum):
    PER_UNIT = 'per_unit'
    PER_HOUR = 'per_hour'
    MONTHLY = 'monthly'
    TIERED = 'tiered'

class InvoicePreferenceEnum(enum.Enum):
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'
    ANNUALLY = 'annually'

class ImportSourceEnum(enum.Enum):
    CSV = 'csv'
    API = 'api'
    CUR = 'cur'

class ImportStatusEnum(enum.Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'

class DocumentTypeEnum(enum.Enum):
    INVOICE = 'invoice'
    RECEIPT = 'receipt'
    CONTRACT = 'contract'
    REPORT = 'report'
    OTHER = 'other'

class NotificationTypeEnum(enum.Enum):
    EMAIL = 'email'
    SMS = 'sms'
    IN_APP = 'in_app'

class NotificationStatusEnum(enum.Enum):
    PENDING = 'pending'
    SENT = 'sent'
    FAILED = 'failed'

# ===========================
# ASSOCIATION TABLES
# ===========================
user_client_mappings = db.Table('user_client_mappings',
    db.Column('user_id', db.Integer, db.ForeignKey('users.user_id'), primary_key=True),
    db.Column('client_id', db.Integer, db.ForeignKey('clients.client_id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=datetime.utcnow)
)

# ===========================
# ROLE & ACCESS MODELS
# ===========================
class Role(db.Model):
    __tablename__ = 'roles'

    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    users = db.relationship('User', backref='role', lazy=True)
    module_access = db.relationship('RoleModuleAccess', backref='role', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'role_id': self.role_id,
            'role_name': self.role_name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RoleModuleAccess(db.Model):
    __tablename__ = 'role_module_access'

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.role_id'), nullable=False)
    module_name = db.Column(db.String(50), nullable=False)
    can_view = db.Column(db.Boolean, default=False)
    can_create = db.Column(db.Boolean, default=False)
    can_edit = db.Column(db.Boolean, default=False)
    can_delete = db.Column(db.Boolean, default=False)

    __table_args__ = (db.UniqueConstraint('role_id', 'module_name'),)

# ===========================
# USER & AUDIT
# ===========================
class User(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.role_id'), nullable=False)
    status = db.Column(db.Enum(StatusEnum), default=StatusEnum.ACTIVE)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_clients = db.relationship('Client', secondary=user_client_mappings, back_populates='assigned_managers')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        # Handle both hashed and plain text passwords for demo
        if self.password_hash.startswith('$'):
            return check_password_hash(self.password_hash, password)
        else:
            # For demo purposes, allow plain text comparison
            return self.password_hash == password

    def has_permission(self, module_name, action):
        """Check if user has permission for a specific action on a module"""
        for access in self.role.module_access:
            if access.module_name == module_name:
                return getattr(access, f'can_{action}', False)
        return False

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role_id': self.role_id,
            'role_name': self.role.role_name if self.role else None,
            'status': self.status.value,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))

    def to_dict(self):
        return {
            'log_id': self.log_id,
            'user_id': self.user_id,
            'action': self.action,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'details': self.details,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }

# ===========================
# CLIENT MODELS
# ===========================
class Client(db.Model):
    __tablename__ = 'clients'
    
    client_id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(100), nullable=False)
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    aws_account_ids = db.Column(db.Text)  # JSON string
    gst_registered = db.Column(db.Boolean, default=False)
    gst_number = db.Column(db.String(15))
    billing_address = db.Column(db.Text)
    invoice_preferences = db.Column(db.Enum(InvoicePreferenceEnum), default=InvoicePreferenceEnum.MONTHLY)
    default_currency = db.Column(db.Enum(CurrencyEnum), default=CurrencyEnum.USD)
    status = db.Column(db.Enum(StatusEnum), default=StatusEnum.ACTIVE)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_managers = db.relationship('User', secondary=user_client_mappings, back_populates='assigned_clients')
    aws_mappings = db.relationship('ClientAwsMapping', backref='client', lazy=True, cascade='all, delete-orphan')
    invoices = db.relationship('Invoice', backref='client', lazy=True)
    
    def get_aws_account_ids(self):
        """Get AWS account IDs as a list"""
        if self.aws_account_ids:
            try:
                return json.loads(self.aws_account_ids)
            except:
                return self.aws_account_ids.split(',') if self.aws_account_ids else []
        return []
    
    def set_aws_account_ids(self, account_ids):
        """Set AWS account IDs from a list"""
        if isinstance(account_ids, list):
            self.aws_account_ids = json.dumps(account_ids)
        else:
            self.aws_account_ids = account_ids
    
    def to_dict(self):
        return {
            'client_id': self.client_id,
            'client_name': self.client_name,
            'contact_person': self.contact_person,
            'email': self.email,
            'phone': self.phone,
            'aws_account_ids': self.get_aws_account_ids(),
            'gst_registered': self.gst_registered,
            'gst_number': self.gst_number,
            'billing_address': self.billing_address,
            'invoice_preferences': self.invoice_preferences.value,
            'default_currency': self.default_currency.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ClientAwsMapping(db.Model):
    __tablename__ = 'client_aws_mappings'
    
    mapping_id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'), nullable=False)
    aws_account_id = db.Column(db.String(12), nullable=False)
    billing_tag_key = db.Column(db.String(50))
    billing_tag_value = db.Column(db.String(100))
    
    def to_dict(self):
        return {
            'mapping_id': self.mapping_id,
            'client_id': self.client_id,
            'aws_account_id': self.aws_account_id,
            'billing_tag_key': self.billing_tag_key,
            'billing_tag_value': self.billing_tag_value
        }

# ===========================
# SERVICE MODELS
# ===========================
class ServiceCategory(db.Model):
    __tablename__ = 'service_categories'
    
    category_id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    
    # Relationships
    services = db.relationship('Service', backref='category', lazy=True)
    
    def to_dict(self):
        return {
            'category_id': self.category_id,
            'category_name': self.category_name,
            'description': self.description
        }

class Service(db.Model):
    __tablename__ = 'services'
    
    service_id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(100), nullable=False)
    service_category_id = db.Column(db.Integer, db.ForeignKey('service_categories.category_id'), nullable=False)
    aws_service_code = db.Column(db.String(50))
    description = db.Column(db.Text)
    status = db.Column(db.Enum(StatusEnum), default=StatusEnum.ACTIVE)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    pricing_components = db.relationship('PricingComponent', backref='service', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'service_id': self.service_id,
            'service_name': self.service_name,
            'service_category_id': self.service_category_id,
            'category_name': self.category.category_name if self.category else None,
            'aws_service_code': self.aws_service_code,
            'description': self.description,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'pricing_components': [comp.to_dict() for comp in self.pricing_components]
        }

class PricingComponent(db.Model):
    __tablename__ = 'pricing_components'
    
    component_id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.service_id'), nullable=False)
    component_name = db.Column(db.String(100), nullable=False)
    metric_type = db.Column(db.Enum(MetricTypeEnum), nullable=False)
    rate = db.Column(db.Numeric(10, 4), nullable=False) 
    unit = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    billing_method = db.Column(db.Enum(BillingMethodEnum), default=BillingMethodEnum.PER_UNIT)
    currency = db.Column(db.Enum(CurrencyEnum), default=CurrencyEnum.USD)
    tier_rules = db.Column(db.Text)  # JSON string for tiered pricing
    status = db.Column(db.Enum(StatusEnum), default=StatusEnum.ACTIVE)
    
    # Relationships
    line_items = db.relationship('InvoiceLineItem', backref='pricing_component', lazy=True)
    
    def get_tier_rules(self):
        """Get tier rules as a dictionary"""
        if self.tier_rules:
            try:
                return json.loads(self.tier_rules)
            except:
                return {}
        return {}
    
    def set_tier_rules(self, rules):
        """Set tier rules from a dictionary"""
        if isinstance(rules, dict):
            self.tier_rules = json.dumps(rules)
        else:
            self.tier_rules = rules
    
    def to_dict(self):
        return {
            'component_id': self.component_id,
            'service_id': self.service_id,
            'component_name': self.component_name,
            'metric_type': self.metric_type.value,
            'unit': self.unit,
            'rate': float(self.rate),
            'quantity': float(self.quantity),
            'billing_method': self.billing_method.value,
            'currency': self.currency.value,
            'tier_rules': self.get_tier_rules(),
            'status': self.status.value
        }

# ===========================
# INVOICE MODELS
# ===========================
class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    invoice_id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'), nullable=False)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    invoice_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)
    usd_to_inr_rate = db.Column(db.Numeric(8, 4))
    gst_applicable = db.Column(db.Boolean, default=False)
    invoice_notes = db.Column(db.Text)
    status = db.Column(db.Enum(InvoiceStatusEnum), default=InvoiceStatusEnum.DRAFT)
    pdf_path = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    line_items = db.relationship('InvoiceLineItem', backref='invoice', lazy=True, cascade='all, delete-orphan')
    attachments = db.relationship('InvoiceAttachment', backref='invoice', lazy=True, cascade='all, delete-orphan')
    
    def generate_invoice_number(self):
        """Generate invoice number in format: TejIT-{clientID}-{YYYYMM}-{sequence}"""
        if not self.invoice_number:
            year_month = datetime.now().strftime('%Y%m')
            # Get the next sequence number for this client and month
            last_invoice = Invoice.query.filter(
                Invoice.client_id == self.client_id,
                Invoice.invoice_number.like(f'TejIT-{self.client_id:03d}-{year_month}-%')
            ).order_by(Invoice.invoice_number.desc()).first()
            
            if last_invoice:
                # Extract sequence number and increment
                parts = last_invoice.invoice_number.split('-')
                sequence = int(parts[-1]) + 1
            else:
                sequence = 1
            
            self.invoice_number = f'TejIT-{self.client_id:03d}-{year_month}-{sequence:03d}'
    
    def calculate_totals(self):
        """Calculate invoice totals"""
        subtotal = sum(item.calculate_amount() for item in self.line_items)
        gst_amount = subtotal * 0.18 if self.gst_applicable else 0
        total = subtotal + gst_amount
        
        return {
            'subtotal': float(subtotal),
            'gst_amount': float(gst_amount),
            'total': float(total)
        }
    
    def to_dict(self):
        totals = self.calculate_totals()
        return {
            'invoice_id': self.invoice_id,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'invoice_number': self.invoice_number,
            'invoice_date': self.invoice_date.isoformat() if self.invoice_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'usd_to_inr_rate': float(self.usd_to_inr_rate) if self.usd_to_inr_rate else None,
            'gst_applicable': self.gst_applicable,
            'invoice_notes': self.invoice_notes,
            'status': self.status.value,
            'pdf_path': self.pdf_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'line_items': [item.to_dict() for item in self.line_items],
            'attachments': [att.to_dict() for att in self.attachments],
            'totals': totals
        }

class InvoiceLineItem(db.Model):
    __tablename__ = 'invoice_line_items'
    
    line_item_id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.invoice_id'), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey('pricing_components.component_id'))
    rate = db.Column(db.Numeric(10, 4), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    discount = db.Column(db.Numeric(5, 2), default=0)  # Percentage
    currency = db.Column(db.Enum(CurrencyEnum), default=CurrencyEnum.USD)
    
    def calculate_amount(self):
        """Calculate line item amount after discount"""
        return float(self.quantity * self.rate * (1 - self.discount/100))
    
    def to_dict(self):
        return {
            'line_item_id': self.line_item_id,
            'invoice_id': self.invoice_id,
            'component_id': self.component_id,
            'component_name': self.pricing_component.component_name if self.pricing_component else None,
            'description': self.description,
            'quantity': float(self.quantity),
            'rate': float(self.rate),
            'discount': float(self.discount),
            'currency': self.currency.value,
            'amount': self.calculate_amount()
        }

class InvoiceAttachment(db.Model):
    __tablename__ = 'invoice_attachments'
    
    attachment_id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.invoice_id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_name = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'attachment_id': self.attachment_id,
            'invoice_id': self.invoice_id,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class InvoiceTemplate(db.Model):
    __tablename__ = 'invoice_templates'
    
    template_id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'), nullable=False)
    template_name = db.Column(db.String(100), nullable=False)
    services = db.Column(db.Text)  # JSON string of component_ids
    frequency = db.Column(db.Enum(InvoicePreferenceEnum), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    client = db.relationship('Client', backref='invoice_templates')
    
    def get_services(self):
        """Get services as a list"""
        if self.services:
            try:
                return json.loads(self.services)
            except:
                return []
        return []
    
    def set_services(self, service_list):
        """Set services from a list"""
        if isinstance(service_list, list):
            self.services = json.dumps(service_list)
        else:
            self.services = service_list
    
    def to_dict(self):
        return {
            'template_id': self.template_id,
            'client_id': self.client_id,
            'template_name': self.template_name,
            'services': self.get_services(),
            'frequency': self.frequency.value,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# ===========================
# USAGE IMPORT MODELS
# ===========================
class UsageImport(db.Model):
    __tablename__ = 'usage_imports'
    
    import_id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'), nullable=False)
    source = db.Column(db.Enum(ImportSourceEnum), nullable=False)
    status = db.Column(db.Enum(ImportStatusEnum), default=ImportStatusEnum.PENDING)
    processed_lines = db.Column(db.Integer, default=0)
    total_lines = db.Column(db.Integer, default=0)
    errors = db.Column(db.Text)
    file_path = db.Column(db.String(255))
    import_date = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)
    
    # Relationships
    client = db.relationship('Client', backref='usage_imports')
    
    def to_dict(self):
        return {
            'import_id': self.import_id,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'source': self.source.value,
            'status': self.status.value,
            'processed_lines': self.processed_lines,
            'total_lines': self.total_lines,
            'errors': self.errors,
            'file_path': self.file_path,
            'import_date': self.import_date.isoformat() if self.import_date else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }

# ===========================
# DOCUMENT MODELS
# ===========================
class Document(db.Model):
    __tablename__ = 'documents'
    
    document_id = db.Column(db.Integer, primary_key=True)
    document_name = db.Column(db.String(255), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    type = db.Column(db.Enum(DocumentTypeEnum), nullable=False)
    size = db.Column(db.Integer)  # Size in bytes
    file_path = db.Column(db.String(255), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'))
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.invoice_id'))
    
    # Relationships
    uploaded_by_user = db.relationship('User', backref='uploaded_documents')
    client = db.relationship('Client', backref='documents')
    invoice = db.relationship('Invoice', backref='documents')
    
    def to_dict(self):
        return {
            'document_id': self.document_id,
            'document_name': self.document_name,
            'uploaded_by': self.uploaded_by,
            'uploaded_by_name': self.uploaded_by_user.username if self.uploaded_by_user else None,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'type': self.type.value,
            'size': self.size,
            'file_path': self.file_path,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'invoice_id': self.invoice_id,
            'invoice_number': self.invoice.invoice_number if self.invoice else None
        }

# ===========================
# NOTIFICATION MODELS
# ===========================
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'))
    type = db.Column(db.Enum(NotificationTypeEnum), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum(NotificationStatusEnum), default=NotificationStatusEnum.PENDING)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime)
    retry_count = db.Column(db.Integer, default=0)
    
    # Relationships
    user = db.relationship('User', backref='notifications')
    client = db.relationship('Client', backref='notifications')
    
    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'user_name': self.user.username if self.user else None,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'type': self.type.value,
            'message': self.message,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'retry_count': self.retry_count
        }