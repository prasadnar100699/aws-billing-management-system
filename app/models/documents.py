from datetime import datetime
from app import db
import os

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    
    # Document details
    name = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    
    # Categorization
    category = db.Column(db.String(100))  # contract, agreement, invoice, etc.
    tags = db.Column(db.String(500))  # comma-separated tags
    
    # Security and access
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_confidential = db.Column(db.Boolean, default=False)
    access_level = db.Column(db.String(20), default='client')  # client, manager, admin
    
    # Metadata
    description = db.Column(db.Text)
    version = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    uploader = db.relationship('User', backref='uploaded_documents', lazy='select')
    
    @property
    def file_extension(self):
        """Get file extension."""
        return os.path.splitext(self.original_filename)[1].lower()
    
    @property
    def file_size_mb(self):
        """Get file size in MB."""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0
    
    @property
    def tag_list(self):
        """Get tags as a list."""
        if self.tags:
            return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
        return []
    
    def add_tag(self, tag):
        """Add a tag to the document."""
        current_tags = self.tag_list
        if tag not in current_tags:
            current_tags.append(tag)
            self.tags = ', '.join(current_tags)
    
    def remove_tag(self, tag):
        """Remove a tag from the document."""
        current_tags = self.tag_list
        if tag in current_tags:
            current_tags.remove(tag)
            self.tags = ', '.join(current_tags)
    
    def to_dict(self):
        """Convert document to dictionary."""
        return {
            'id': self.id,
            'client_name': self.client.name if self.client else None,
            'name': self.name,
            'original_filename': self.original_filename,
            'file_size_mb': self.file_size_mb,
            'mime_type': self.mime_type,
            'category': self.category,
            'tags': self.tag_list,
            'uploaded_by': self.uploader.full_name if self.uploader else None,
            'is_confidential': self.is_confidential,
            'access_level': self.access_level,
            'description': self.description,
            'version': self.version,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Document {self.name}>'