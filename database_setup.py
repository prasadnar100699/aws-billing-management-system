#!/usr/bin/env python3
"""
Database setup script for Tej IT Solutions Billing System
Run this script to initialize the database with tables and sample data.
"""

import os
import sys
from datetime import datetime, date
from decimal import Decimal

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.users import User, Role
from app.models.clients import Client
from app.models.services import Service
from app.models.invoices import Invoice, InvoiceLineItem
from app.models.exchange_rates import ExchangeRate

def create_database():
    """Create database tables."""
    print("Creating database tables...")
    db.create_all()
    print("✓ Database tables created successfully")

def create_roles():
    """Create default roles."""
    print("Creating default roles...")
    
    roles_data = [
        {
            'name': 'Super Admin',
            'description': 'Full system access with all permissions',
            'permissions': {
                'users': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'clients': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'invoices': {'view': True, 'create': True, 'edit': True, 'delete': True, 'finalize': True},
                'services': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'reports': {'view': True, 'export': True},
                'credentials': {'view': True, 'create': True, 'edit': True, 'delete': True},
                'admin': {'view': True, 'backup': True, 'delegate': True}
            }
        },
        {
            'name': 'Client Manager',
            'description': 'Manage assigned clients and their invoices',
            'permissions': {
                'clients': {'view': True, 'create': True, 'edit': True},
                'invoices': {'view': True, 'create': True, 'edit': True, 'approve': True},
                'services': {'view': True, 'create': True, 'edit': True},
                'reports': {'view': True, 'export': True}
            }
        },
        {
            'name': 'Auditor',
            'description': 'Read-only access for auditing purposes',
            'permissions': {
                'clients': {'view': True},
                'invoices': {'view': True},
                'services': {'view': True},
                'reports': {'view': True, 'export': True},
                'audit': {'view': True}
            }
        }
    ]
    
    for role_data in roles_data:
        role = Role.query.filter_by(name=role_data['name']).first()
        if not role:
            role = Role(
                name=role_data['name'],
                description=role_data['description'],
                permissions=role_data['permissions']
            )
            db.session.add(role)
            print(f"✓ Created role: {role_data['name']}")
    
    db.session.commit()

def create_users():
    """Create default users."""
    print("Creating default users...")
    
    # Get roles
    super_admin_role = Role.query.filter_by(name='Super Admin').first()
    manager_role = Role.query.filter_by(name='Client Manager').first()
    auditor_role = Role.query.filter_by(name='Auditor').first()
    
    users_data = [
        {
            'username': 'admin',
            'email': 'admin@tejitsolutions.com',
            'first_name': 'System',
            'last_name': 'Administrator',
            'password': 'admin123',
            'role_id': super_admin_role.id
        },
        {
            'username': 'manager1',
            'email': 'manager1@tejitsolutions.com',
            'first_name': 'Client',
            'last_name': 'Manager',
            'password': 'manager123',
            'role_id': manager_role.id
        },
        {
            'username': 'auditor1',
            'email': 'auditor1@tejitsolutions.com',
            'first_name': 'System',
            'last_name': 'Auditor',
            'password': 'auditor123',
            'role_id': auditor_role.id
        }
    ]
    
    for user_data in users_data:
        user = User.query.filter_by(username=user_data['username']).first()
        if not user:
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                role_id=user_data['role_id']
            )
            user.set_password(user_data['password'])
            db.session.add(user)
            print(f"✓ Created user: {user_data['username']} (password: {user_data['password']})")
    
    db.session.commit()

def create_sample_services():
    """Create sample services."""
    print("Creating sample services...")
    
    services_data = [
        {
            'name': 'AWS EC2 - t3.medium',
            'description': 'AWS EC2 Instance - t3.medium (2 vCPU, 4GB RAM)',
            'category': 'Cloud Infrastructure',
            'pricing_model': 'hourly',
            'usd_rate': Decimal('0.04'),
            'inr_rate': Decimal('3.50'),
            'unit': 'hour'
        },
        {
            'name': 'AWS EC2 - t3.large',
            'description': 'AWS EC2 Instance - t3.large (2 vCPU, 8GB RAM)',
            'category': 'Cloud Infrastructure',
            'pricing_model': 'hourly',
            'usd_rate': Decimal('0.08'),
            'inr_rate': Decimal('7.00'),
            'unit': 'hour'
        },
        {
            'name': 'Software Development',
            'description': 'Custom software development services',
            'category': 'Development',
            'pricing_model': 'hourly',
            'usd_rate': Decimal('50.00'),
            'inr_rate': Decimal('4000.00'),
            'unit': 'hour'
        },
        {
            'name': 'System Administration',
            'description': 'Server and system administration services',
            'category': 'Support',
            'pricing_model': 'hourly',
            'usd_rate': Decimal('30.00'),
            'inr_rate': Decimal('2500.00'),
            'unit': 'hour'
        },
        {
            'name': 'Database Management',
            'description': 'Database design, optimization and management',
            'category': 'Database',
            'pricing_model': 'hourly',
            'usd_rate': Decimal('40.00'),
            'inr_rate': Decimal('3200.00'),
            'unit': 'hour'
        },
        {
            'name': 'AWS S3 Storage',
            'description': 'AWS S3 Object Storage',
            'category': 'Storage',
            'pricing_model': 'monthly',
            'usd_rate': Decimal('0.023'),
            'inr_rate': Decimal('1.92'),
            'unit': 'GB/month'
        }
    ]
    
    for service_data in services_data:
        service = Service.query.filter_by(name=service_data['name']).first()
        if not service:
            service = Service(**service_data)
            db.session.add(service)
            print(f"✓ Created service: {service_data['name']}")
    
    db.session.commit()

def create_sample_clients():
    """Create sample clients."""
    print("Creating sample clients...")
    
    # Get manager user
    manager = User.query.filter_by(username='manager1').first()
    
    clients_data = [
        {
            'name': 'Acme Corporation',
            'company_name': 'Acme Corp Pvt. Ltd.',
            'email': 'billing@acmecorp.com',
            'phone': '+91-80-1234-5678',
            'address_line1': '123 Business Street',
            'city': 'Bangalore',
            'state': 'Karnataka',
            'postal_code': '560001',
            'country': 'India',
            'gst_number': '29ABCDE1234F1Z5',
            'currency_preference': 'INR',
            'payment_terms': 30,
            'manager_id': manager.id
        },
        {
            'name': 'Global Tech Solutions',
            'company_name': 'Global Tech Solutions Inc.',
            'email': 'finance@globaltech.com',
            'phone': '+1-555-123-4567',
            'address_line1': '456 Tech Avenue',
            'city': 'San Francisco',
            'state': 'California',
            'postal_code': '94102',
            'country': 'United States',
            'currency_preference': 'USD',
            'payment_terms': 15,
            'manager_id': manager.id
        },
        {
            'name': 'Digital Innovations Ltd',
            'company_name': 'Digital Innovations Limited',
            'email': 'accounts@digitalinnovations.co.uk',
            'phone': '+44-20-1234-5678',
            'address_line1': '789 Innovation Road',
            'city': 'London',
            'state': 'England',
            'postal_code': 'SW1A 1AA',
            'country': 'United Kingdom',
            'currency_preference': 'USD',
            'payment_terms': 30,
            'manager_id': manager.id
        }
    ]
    
    for client_data in clients_data:
        client = Client.query.filter_by(email=client_data['email']).first()
        if not client:
            client = Client(**client_data)
            db.session.add(client)
            print(f"✓ Created client: {client_data['name']}")
    
    db.session.commit()

def create_exchange_rates():
    """Create sample exchange rates."""
    print("Creating sample exchange rates...")
    
    rates_data = [
        {
            'from_currency': 'USD',
            'to_currency': 'INR',
            'rate': Decimal('83.25'),
            'rate_date': date.today(),
            'source': 'manual'
        }
    ]
    
    for rate_data in rates_data:
        rate = ExchangeRate.query.filter_by(
            from_currency=rate_data['from_currency'],
            to_currency=rate_data['to_currency'],
            rate_date=rate_data['rate_date']
        ).first()
        
        if not rate:
            rate = ExchangeRate(**rate_data)
            db.session.add(rate)
            print(f"✓ Created exchange rate: {rate_data['from_currency']}/{rate_data['to_currency']} = {rate_data['rate']}")
    
    db.session.commit()

def create_sample_invoices():
    """Create sample invoices."""
    print("Creating sample invoices...")
    
    # Get required objects
    manager = User.query.filter_by(username='manager1').first()
    acme_client = Client.query.filter_by(name='Acme Corporation').first()
    global_client = Client.query.filter_by(name='Global Tech Solutions').first()
    
    dev_service = Service.query.filter_by(name='Software Development').first()
    admin_service = Service.query.filter_by(name='System Administration').first()
    
    if not all([manager, acme_client, global_client, dev_service, admin_service]):
        print("⚠ Skipping sample invoices - required data not found")
        return
    
    # Sample invoice 1 - INR
    invoice1 = Invoice(
        client_id=acme_client.id,
        creator_id=manager.id,
        invoice_date=date.today(),
        currency='INR',
        gst_applicable=True,
        status='Sent',
        notes='Monthly development services for Q4 2024'
    )
    invoice1.generate_invoice_number()
    db.session.add(invoice1)
    db.session.flush()
    
    # Line items for invoice 1
    line_item1 = InvoiceLineItem(
        invoice_id=invoice1.id,
        service_id=dev_service.id,
        description='Custom CRM Development - Phase 1',
        quantity=Decimal('40.00'),
        unit='hour',
        inr_rate=dev_service.inr_rate
    )
    line_item1.calculate_amounts()
    db.session.add(line_item1)
    
    line_item2 = InvoiceLineItem(
        invoice_id=invoice1.id,
        service_id=admin_service.id,
        description='Server Setup and Configuration',
        quantity=Decimal('8.00'),
        unit='hour',
        inr_rate=admin_service.inr_rate
    )
    line_item2.calculate_amounts()
    db.session.add(line_item2)
    
    # Calculate totals
    invoice1.calculate_totals()
    
    # Sample invoice 2 - USD
    invoice2 = Invoice(
        client_id=global_client.id,
        creator_id=manager.id,
        invoice_date=date.today(),
        currency='USD',
        gst_applicable=False,
        status='Draft',
        notes='Cloud infrastructure consultation services'
    )
    invoice2.generate_invoice_number()
    db.session.add(invoice2)
    db.session.flush()
    
    # Line items for invoice 2
    line_item3 = InvoiceLineItem(
        invoice_id=invoice2.id,
        service_id=dev_service.id,
        description='Cloud Architecture Consultation',
        quantity=Decimal('20.00'),
        unit='hour',
        usd_rate=dev_service.usd_rate
    )
    line_item3.calculate_amounts()
    db.session.add(line_item3)
    
    # Calculate totals
    invoice2.calculate_totals()
    
    db.session.commit()
    print(f"✓ Created sample invoices: {invoice1.invoice_number}, {invoice2.invoice_number}")

def main():
    """Main setup function."""
    print("🚀 Initializing Tej IT Solutions Billing System Database")
    print("=" * 60)
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        try:
            # Create database and tables
            create_database()
            
            # Create roles and users
            create_roles()
            create_users()
            
            # Create sample data
            create_sample_services()
            create_sample_clients()
            create_exchange_rates()
            create_sample_invoices()
            
            print("\n" + "=" * 60)
            print("✅ Database setup completed successfully!")
            print("\n📋 Default Login Credentials:")
            print("   Super Admin: admin / admin123")
            print("   Manager: manager1 / manager123")
            print("   Auditor: auditor1 / auditor123")
            print("\n🌐 Start the application with: python app.py")
            print("   Then visit: http://localhost:5000")
            print("=" * 60)
            
        except Exception as e:
            print(f"❌ Error setting up database: {str(e)}")
            db.session.rollback()
            return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())