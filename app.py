from app import create_app, db
import os

app = create_app()

def init_database():
    """Initialize database with default roles and admin user."""
    with app.app_context():
        # Create tables
        db.create_all()
        
        from app.models.users import User, Role
        
        # Create default roles if they don't exist
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
        
        # Create default super admin user
        super_admin_role = Role.query.filter_by(name='Super Admin').first()
        admin_user = User.query.filter_by(username='admin').first()
        
        if not admin_user and super_admin_role:
            admin_user = User(
                username='admin',
                email='admin@tejitsolutions.com',
                first_name='System',
                last_name='Administrator',
                role_id=super_admin_role.id
            )
            admin_user.set_password('admin123')  # Change in production
            db.session.add(admin_user)
        
        # Add sample exchange rate
        from app.models.exchange_rates import ExchangeRate
        from datetime import date
        
        if not ExchangeRate.query.first():
            sample_rate = ExchangeRate(
                from_currency='USD',
                to_currency='INR',
                rate=83.25,
                rate_date=date.today(),
                source='manual'
            )
            db.session.add(sample_rate)
        
        db.session.commit()
        print("Database initialized successfully!")
        print("Default admin user: admin / admin123")

if __name__ == '__main__':
    # Initialize database on first run
    if not os.path.exists('tej_billing.db'):
        init_database()
    
    app.run(debug=True, host='0.0.0.0', port=5000)