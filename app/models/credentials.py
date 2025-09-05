from datetime import datetime
from app import db
from app.utils.encryption import encrypt_data, decrypt_data

class Credential(db.Model):
    __tablename__ = 'credentials'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    
    # Credential details
    name = db.Column(db.String(200), nullable=False)
    credential_type = db.Column(db.String(50), nullable=False)  # AWS, Database, Server, etc.
    description = db.Column(db.Text)
    
    # Encrypted data
    encrypted_data = db.Column(db.LargeBinary, nullable=False)
    
    # Access control
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    access_level = db.Column(db.String(20), default='super_admin')  # super_admin only
    
    # Metadata
    environment = db.Column(db.String(50))  # production, staging, development
    is_active = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime)
    last_accessed = db.Column(db.DateTime)
    accessed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_credentials', lazy='select')
    last_accessor = db.relationship('User', foreign_keys=[accessed_by], backref='accessed_credentials', lazy='select')
    
    def set_credential_data(self, data):
        """Encrypt and store credential data."""
        self.encrypted_data = encrypt_data(data)
    
    def get_credential_data(self):
        """Decrypt and return credential data."""
        if self.encrypted_data:
            return decrypt_data(self.encrypted_data)
        return None
    
    def record_access(self, user_id):
        """Record credential access."""
        self.last_accessed = datetime.utcnow()
        self.accessed_by = user_id
    
    @property
    def is_expired(self):
        """Check if credential is expired."""
        if self.expires_at:
            return self.expires_at < datetime.utcnow()
        return False
    
    def to_dict(self, include_data=False):
        """Convert credential to dictionary."""
        result = {
            'id': self.id,
            'client_name': self.client.name if self.client else None,
            'name': self.name,
            'credential_type': self.credential_type,
            'description': self.description,
            'environment': self.environment,
            'is_active': self.is_active,
            'is_expired': self.is_expired,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_by': self.creator.full_name if self.creator else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'created_at': self.created_at.isoformat()
        }
        
        if include_data:
            result['data'] = self.get_credential_data()
        
        return result
    
    def __repr__(self):
        return f'<Credential {self.name}>'