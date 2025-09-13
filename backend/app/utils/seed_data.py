from app import db
from app.models import *
from datetime import datetime, timedelta
import json

def seed_initial_data():
    """Seed database with initial data"""
    
    # Create roles
    roles_data = [
        {
            'role_name': 'Super Admin',
            'description': 'Full system access, manages users, roles, configurations',
            'permissions': {
                'Users': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Clients': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Services': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Invoices': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Usage': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Documents': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Reports': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Notifications': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Analytics': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True}
            }
        },
        {
            'role_name': 'Client Manager',
            'description': 'Manages assigned clients, invoices, usage imports',
            'permissions': {
                'Users': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Clients': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': False},
                'Services': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Invoices': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Usage': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Documents': {'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': True},
                'Reports': {'can_view': True, 'can_create': True, 'can_edit': False, 'can_delete': False},
                'Notifications': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Analytics': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False}
            }
        },
        {
            'role_name': 'Auditor',
            'description': 'Read-only access to data, reporting, analytics',
            'permissions': {
                'Users': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Clients': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Services': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Invoices': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Usage': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Documents': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Reports': {'can_view': True, 'can_create': True, 'can_edit': False, 'can_delete': False},
                'Notifications': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
                'Analytics': {'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False}
            }
        }
    ]
    
    for role_data in roles_data:
        role = Role.query.filter_by(role_name=role_data['role_name']).first()
        if not role:
            role = Role(
                role_name=role_data['role_name'],
                description=role_data['description']
            )
            db.session.add(role)
            db.session.flush()
            
            # Add permissions
            for module_name, perms in role_data['permissions'].items():
                access = RoleModuleAccess(
                    role_id=role.role_id,
                    module_name=module_name,
                    can_view=perms['can_view'],
                    can_create=perms['can_create'],
                    can_edit=perms['can_edit'],
                    can_delete=perms['can_delete']
                )
                db.session.add(access)
    
    # Create default admin user
    admin_role = Role.query.filter_by(role_name='Super Admin').first()
    admin_user = User.query.filter_by(email='admin@tejit.com').first()
    if not admin_user:
        admin_user = User(
            username='admin',
            email='admin@tejit.com',
            role_id=admin_role.role_id,
            status='active'
        )
        admin_user.set_password('Admin@123')
        db.session.add(admin_user)
    
    # Create client manager user
    client_manager_role = Role.query.filter_by(role_name='Client Manager').first()
    manager_user = User.query.filter_by(email='manager@tejit.com').first()
    if not manager_user:
        manager_user = User(
            username='manager',
            email='manager@tejit.com',
            role_id=client_manager_role.role_id,
            status='active'
        )
        manager_user.set_password('Manager@123')
        db.session.add(manager_user)
    
    # Create auditor user
    auditor_role = Role.query.filter_by(role_name='Auditor').first()
    auditor_user = User.query.filter_by(email='auditor@tejit.com').first()
    if not auditor_user:
        auditor_user = User(
            username='auditor',
            email='auditor@tejit.com',
            role_id=auditor_role.role_id,
            status='active'
        )
        auditor_user.set_password('Auditor@123')
        db.session.add(auditor_user)
    
    # Create service categories
    categories_data = [
        {'category_name': 'Compute', 'description': 'Computing services like EC2, Lambda'},
        {'category_name': 'Storage', 'description': 'Storage services like S3, EBS'},
        {'category_name': 'Database', 'description': 'Database services like RDS, DynamoDB'},
        {'category_name': 'Networking', 'description': 'Networking services like VPC, CloudFront'},
        {'category_name': 'Analytics', 'description': 'Analytics services like Redshift, EMR'},
        {'category_name': 'Machine Learning', 'description': 'ML services like SageMaker'},
        {'category_name': 'Security', 'description': 'Security services like IAM, KMS'},
        {'category_name': 'Management', 'description': 'Management services like CloudWatch'}
    ]
    
    for cat_data in categories_data:
        category = ServiceCategory.query.filter_by(category_name=cat_data['category_name']).first()
        if not category:
            category = ServiceCategory(
                category_name=cat_data['category_name'],
                description=cat_data['description']
            )
            db.session.add(category)
    
    db.session.commit()
    
    # Create sample services
    compute_category = ServiceCategory.query.filter_by(category_name='Compute').first()
    storage_category = ServiceCategory.query.filter_by(category_name='Storage').first()
    
    services_data = [
        {
            'service_name': 'EC2',
            'category_id': compute_category.category_id,
            'aws_service_code': 'AmazonEC2',
            'description': 'Elastic Compute Cloud',
            'components': [
                {
                    'component_name': 'EC2 Instance-Hours',
                    'metric_type': 'HOUR',
                    'unit': 'hour',
                    'rate': 0.10,
                    'billing_method': 'per_unit',
                    'currency': 'USD'
                },
                {
                    'component_name': 'EBS Storage',
                    'metric_type': 'GB',
                    'unit': 'GB-month',
                    'rate': 0.08,
                    'billing_method': 'per_unit',
                    'currency': 'USD'
                }
            ]
        },
        {
            'service_name': 'S3',
            'category_id': storage_category.category_id,
            'aws_service_code': 'AmazonS3',
            'description': 'Simple Storage Service',
            'components': [
                {
                    'component_name': 'S3 Standard Storage',
                    'metric_type': 'GB',
                    'unit': 'GB-month',
                    'rate': 0.023,
                    'billing_method': 'per_unit',
                    'currency': 'USD'
                },
                {
                    'component_name': 'S3 Requests',
                    'metric_type': 'REQUEST',
                    'unit': 'request',
                    'rate': 0.0004,
                    'billing_method': 'per_unit',
                    'currency': 'USD'
                }
            ]
        }
    ]
    
    for service_data in services_data:
        service = Service.query.filter_by(service_name=service_data['service_name']).first()
        if not service:
            service = Service(
                service_name=service_data['service_name'],
                service_category_id=service_data['category_id'],
                aws_service_code=service_data['aws_service_code'],
                description=service_data['description']
            )
            db.session.add(service)
            db.session.flush()
            
            # Add pricing components
            for comp_data in service_data['components']:
                component = PricingComponent(
                    service_id=service.service_id,
                    component_name=comp_data['component_name'],
                    metric_type=comp_data['metric_type'],
                    unit=comp_data['unit'],
                    rate=comp_data['rate'],
                    billing_method=comp_data['billing_method'],
                    currency=comp_data['currency']
                )
                db.session.add(component)
    
    # Create sample client
    sample_client = Client.query.filter_by(email='client@example.com').first()
    if not sample_client:
        sample_client = Client(
            client_name='Sample Corporation',
            contact_person='John Doe',
            email='client@example.com',
            phone='+1-555-0123',
            gst_registered=True,
            gst_number='27AAECB1234C1Z5',
            billing_address='123 Business St\nSuite 100\nCity, State 12345',
            invoice_preferences='monthly',
            default_currency='USD'
        )
        sample_client.set_aws_account_ids(['123456789012', '987654321098'])
        db.session.add(sample_client)
    
    db.session.commit()
    print("Initial data seeded successfully!")

def create_sample_data():
    """Create additional sample data for testing"""
    
    # Create client manager user
    client_manager_role = Role.query.filter_by(role_name='Client Manager').first()
    manager_user = User.query.filter_by(email='manager@tejit.com').first()
    if not manager_user:
        manager_user = User(
            username='manager',
            email='manager@tejit.com',
            role_id=client_manager_role.role_id,
            status='active'
        )
        manager_user.set_password('Manager@123')
        db.session.add(manager_user)
        db.session.flush()
        
        # Assign sample client to manager
        sample_client = Client.query.filter_by(email='client@example.com').first()
        if sample_client:
            sample_client.assigned_managers.append(manager_user)
    
    # Create auditor user
    auditor_role = Role.query.filter_by(role_name='Auditor').first()
    auditor_user = User.query.filter_by(email='auditor@tejit.com').first()
    if not auditor_user:
        auditor_user = User(
            username='auditor',
            email='auditor@tejit.com',
            role_id=auditor_role.role_id,
            status='active'
        )
        auditor_user.set_password('Auditor@123')
        db.session.add(auditor_user)
    
    db.session.commit()
    print("Sample data created successfully!")