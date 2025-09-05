from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class Role(db.Model):
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    permissions = db.Column(db.JSON)  # Store permissions as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    users = db.relationship('User', backref='role', lazy='dynamic')
    
    def __repr__(self):
        return f'<Role {self.name}>'

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Delegation fields
    is_delegated_admin = db.Column(db.Boolean, default=False)
    delegation_expires = db.Column(db.DateTime)
    delegated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    managed_clients = db.relationship('Client', backref='manager', lazy='dynamic')
    created_invoices = db.relationship('Invoice', backref='creator', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_super_admin(self):
        """Check if user is super admin."""
        return self.role.name == 'Super Admin' or self.is_delegated_admin
    
    @property
    def is_client_manager(self):
        """Check if user is client manager."""
        return self.role.name == 'Client Manager'
    
    @property
    def is_auditor(self):
        """Check if user is auditor."""
        return self.role.name == 'Auditor'
    
    def has_permission(self, module, permission):
        """Check if user has specific permission for a module."""
        if not self.role.permissions:
            return False
        
        module_perms = self.role.permissions.get(module, {})
        return module_perms.get(permission, False)
    
    def to_dict(self):
        """Convert user to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role.name,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<User {self.username}>'