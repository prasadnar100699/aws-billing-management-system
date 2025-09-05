from flask_sqlalchemy import SQLAlchemy
from app import db

# Import all models to ensure they're registered
from .users import User, Role
from .clients import Client
from .services import Service
from .invoices import Invoice, InvoiceLineItem
from .documents import Document
from .payments import Payment
from .credentials import Credential
from .audit_log import AuditLog
from .exchange_rates import ExchangeRate
from .email_logs import EmailLog
from .notifications import Notification

__all__ = [
    'User', 'Role', 'Client', 'Service', 'Invoice', 'InvoiceLineItem',
    'Document', 'Payment', 'Credential', 'AuditLog', 'ExchangeRate',
    'EmailLog', 'Notification'
]