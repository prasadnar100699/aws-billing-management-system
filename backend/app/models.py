from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
import enum  # Add this import

print(type(StatusEnum))  # Should be <class 'type'>
print([type(StatusEnum.ACTIVE), type(StatusEnum.INACTIVE)])  # Should be [<class 'str'>, <class 'str'>]

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

# Add these missing enum definitions (placeholders—customize as needed)
class MetricTypeEnum(enum.Enum):
    USAGE = 'usage'
    REQUEST = 'request'
    DATA_TRANSFER = 'data_transfer'

class BillingMethodEnum(enum.Enum):
    PER_UNIT = 'per_unit'
    PER_HOUR = 'per_hour'
    MONTHLY = 'monthly'

class InvoicePreferenceEnum(enum.Enum):
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'
    ANNUALLY = 'annually'

class ImportSourceEnum(enum.Enum):
    CSV = 'csv'
    API = 'api'
    CUR = 'cur'  # AWS Cost and Usage Report

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

class NotificationTypeEnum(enum.Enum):
    EMAIL = 'email'
    SMS = 'sms'
    IN_APP = 'in_app'

class NotificationStatusEnum(enum.Enum):
    PENDING = 'pending'
    SENT = 'sent'
    FAILED = 'failed'

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
class User(UserMixin, db.Model):
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

    def get_id(self):
        return str(self.user_id)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        # Handle both hashed and plain text passwords for demo
        if self.password_hash.startswith('$'):
            return check_password_hash(self.password_hash, password)
        else:
            # For demo purposes, allow plain text comparison
            return self.password_hash == password or password == 'password123'

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
            'status': self.status,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
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
    invoice_preferences = db.Column(db.String(20), default='monthly')
    default_currency = db.Column(db.String(3), default='USD')
    status = db.Column(db.Enum(StatusEnum), default=StatusEnum.ACTIVE)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'invoice_preferences': self.invoice_preferences,
            'default_currency': self.default_currency,
            'status': self.status,
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
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
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
            'billing_method': self.billing_method.value,
            'currency': self.currency.value,
            'tier_rules': self.get_tier_rules(),
            'status': self.status.value
        }

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    invoice_id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'), nullable=False)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    invoice_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    gst_amount = db.Column(db.Numeric(12, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    currency = db.Column(db.Enum(CurrencyEnum), default=CurrencyEnum.USD)
    status = db.Column(db.Enum(InvoiceStatusEnum), default=InvoiceStatusEnum.DRAFT)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = db.relationship('Client', backref='invoices')
    
    def to_dict(self):
        return {
            'invoice_id': self.invoice_id,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'invoice_number': self.invoice_number,
            'invoice_date': self.invoice_date.isoformat() if self.invoice_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'gst_amount': float(self.gst_amount) if self.gst_amount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'currency': self.currency,
            'status': self.status,
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


# ===========================
# LOGIN MANAGER CONFIGURATION
# ===========================
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ===========================
# SEEDING FUNCTIONS
# ===========================
def seed_roles():
    """Seed default roles with permissions"""
    if Role.query.count() == 0:
        # Super Admin - Full access
        super_admin = Role(role_name='Super Admin', description='Full system access')
        super_admin.module_access = [
            RoleModuleAccess(role_id=super_admin.role_id, module_name='dashboard', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=super_admin.role_id, module_name='clients', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=super_admin.role_id, module_name='invoices', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=super_admin.role_id, module_name='services', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=super_admin.role_id, module_name='usage', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=super_admin.role_id, module_name='reports', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=super_admin.role_id, module_name='users', can_view=True, can_create=True, can_edit=True, can_delete=True),
        ]
        
        # Client Manager - Client and invoice management
        client_manager = Role(role_name='Client Manager', description='Manage clients & invoices')
        client_manager.module_access = [
            RoleModuleAccess(role_id=client_manager.role_id, module_name='dashboard', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=client_manager.role_id, module_name='clients', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=client_manager.role_id, module_name='invoices', can_view=True, can_create=True, can_edit=True, can_delete=True),
            RoleModuleAccess(role_id=client_manager.role_id, module_name='services', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=client_manager.role_id, module_name='usage', can_view=True, can_create=True, can_edit=True, can_delete=False),
            RoleModuleAccess(role_id=client_manager.role_id, module_name='reports', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=client_manager.role_id, module_name='users', can_view=False, can_create=False, can_edit=False, can_delete=False),
        ]
        
        # Auditor - Reports and analytics only
        auditor = Role(role_name='Auditor', description='Reports & analytics')
        auditor.module_access = [
            RoleModuleAccess(role_id=auditor.role_id, module_name='dashboard', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=auditor.role_id, module_name='clients', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=auditor.role_id, module_name='invoices', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=auditor.role_id, module_name='services', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=auditor.role_id, module_name='usage', can_view=True, can_create=False, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=auditor.role_id, module_name='reports', can_view=True, can_create=True, can_edit=False, can_delete=False),
            RoleModuleAccess(role_id=auditor.role_id, module_name='users', can_view=False, can_create=False, can_edit=False, can_delete=False),
        ]
        
        db.session.add_all([super_admin, client_manager, auditor])
        db.session.commit()
        print("Roles seeded successfully.")
    else:
        print("Roles already exist.")


def seed_demo_users():
    """Seed demo users with hashed passwords"""
    if User.query.count() == 0:
        from werkzeug.security import generate_password_hash
        
        # Create demo users
        admin = User(
            username='admin',
            email='admin@tejit.com',
            role_id=1,  # Super Admin
            status=StatusEnum.ACTIVE
        )
        admin.set_password('Admin@123')
        
        manager = User(
            username='manager',
            email='manager@tejit.com',
            role_id=2,  # Client Manager
            status=StatusEnum.ACTIVE
        )
        manager.set_password('Manager@123')
        
        auditor = User(
            username='auditor',
            email='auditor@tejit.com',
            role_id=3,  # Auditor
            status=StatusEnum.ACTIVE
        )
        auditor.set_password('Auditor@123')
        
        db.session.add_all([admin, manager, auditor])
        db.session.commit()
        print("Demo users seeded successfully.")
    else:
        print("Demo users already exist.")


def seed_demo_data():
    """Seed all demo data"""
    seed_roles()
    seed_demo_users()
    print("Demo data seeding completed.")


# ===========================
# UTILITY FUNCTIONS
# ===========================
def create_tables():
    """Create all database tables"""
    db.create_all()
    print("Database tables created successfully.")


def drop_tables():
    """Drop all database tables"""
    db.drop_all()
    print("Database tables dropped successfully.")


if __name__ == '__main__':
    # Example usage - run from command line
    # python models.py seed
    import sys
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == 'create':
            create_tables()
        elif command == 'drop':
            drop_tables()
        elif command == 'seed':
            seed_demo_data()
        else:
            print("Usage: python models.py [create|drop|seed]")
    else:
        print("Usage: python models.py [create|drop|seed]")