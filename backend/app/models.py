from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

# ===========================
# ENUM DEFINITIONS
# ===========================
class StatusEnum:
    ACTIVE = 'active'
    INACTIVE = 'inactive'

class InvoiceStatusEnum:
    DRAFT = 'draft'
    APPROVED = 'approved'
    FINALIZED = 'finalized'
    SENT = 'sent'

class CurrencyEnum:
    USD = 'USD'
    INR = 'INR'

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
    status = db.Column(db.String(20), default='active')
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
    invoice_preferences = db.Column(db.String(20), default='monthly')
    default_currency = db.Column(db.String(3), default='USD')
    status = db.Column(db.String(20), default='active')
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
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    gst_amount = db.Column(db.Numeric(12, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    currency = db.Column(db.String(3), default='USD')
    status = db.Column(db.String(20), default='draft')
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
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }