from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config  # Import Config

# Initialize extensions (no circular imports)
db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
   
    # Load configuration from Config class
    app.config.from_object(Config)
   
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
   
    # Configure CORS
    cors_origins = app.config['CORS_ORIGINS'].split(',')
    CORS(app, origins=cors_origins, supports_credentials=True)
   
    # Register blueprints
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)
   
    # Create tables and seed data
    with app.app_context():
        db.create_all()
        seed_initial_data()
   
    return app

def seed_initial_data():
    """Seed initial data if database is empty"""
    # Import models INSIDE function to avoid circular imports during module load
    from app.models import Role, User, RoleModuleAccess, StatusEnum
   
    # Check if data already exists
    if Role.query.first():
        return
   
    # Create roles
    roles_data = [
        {
            'role_name': 'Super Admin',
            'description': 'Full system access with all permissions'
        },
        {
            'role_name': 'Client Manager',
            'description': 'Can manage assigned clients and generate invoices'
        },
        {
            'role_name': 'Auditor',
            'description': 'Read-only access for reports and analytics'
        }
    ]
   
    super_admin = Role(role_name=roles_data[0]['role_name'], description=roles_data[0]['description'])
    client_manager = Role(role_name=roles_data[1]['role_name'], description=roles_data[1]['description'])
    auditor = Role(role_name=roles_data[2]['role_name'], description=roles_data[2]['description'])
    db.session.add_all([super_admin, client_manager, auditor])
    db.session.commit()  # Commit to get role_ids
   
    # Create module access permissions (now with valid role_ids)
    permissions_data = [
        # Super Admin permissions
        (super_admin.role_id, 'dashboard', True, True, True, True),
        (super_admin.role_id, 'clients', True, True, True, True),
        (super_admin.role_id, 'users', True, True, True, True),
        (super_admin.role_id, 'roles', True, True, True, True),
        (super_admin.role_id, 'services', True, True, True, True),
        (super_admin.role_id, 'invoices', True, True, True, True),
        (super_admin.role_id, 'usage_import', True, True, True, True),
        (super_admin.role_id, 'documents', True, True, True, True),
        (super_admin.role_id, 'reports', True, True, True, True),
        (super_admin.role_id, 'notifications', True, True, True, True),
       
        # Client Manager permissions
        (client_manager.role_id, 'dashboard', True, False, False, False),
        (client_manager.role_id, 'clients', True, True, True, False),
        (client_manager.role_id, 'services', True, False, False, False),
        (client_manager.role_id, 'invoices', True, True, True, False),
        (client_manager.role_id, 'usage_import', True, True, False, False),
        (client_manager.role_id, 'documents', True, True, False, False),
        (client_manager.role_id, 'reports', True, False, False, False),
        (client_manager.role_id, 'notifications', True, False, False, False),
       
        # Auditor permissions
        (auditor.role_id, 'dashboard', True, False, False, False),
        (auditor.role_id, 'clients', True, False, False, False),
        (auditor.role_id, 'invoices', True, False, False, False),
        (auditor.role_id, 'documents', True, False, False, False),
        (auditor.role_id, 'reports', True, False, False, False),
        (auditor.role_id, 'usage_import', True, False, False, False),
        (auditor.role_id, 'notifications', True, False, False, False)
    ]
   
    for role_id, module_name, can_view, can_create, can_edit, can_delete in permissions_data:
        access = RoleModuleAccess(
            role_id=role_id,
            module_name=module_name,
            can_view=can_view,
            can_create=can_create,
            can_edit=can_edit,
            can_delete=can_delete
        )
        db.session.add(access)
   
    # Create default users
    users_data = [
        {
            'username': 'admin',
            'email': 'admin@tejit.com',
            'password': 'Admin@123',
            'role_id': super_admin.role_id
        },
        {
            'username': 'manager',
            'email': 'manager@tejit.com',
            'password': 'Admin@123',
            'role_id': client_manager.role_id
        },
        {
            'username': 'auditor',
            'email': 'auditor@tejit.com',
            'password': 'Admin@123',
            'role_id': auditor.role_id
        }
    ]
   
    for user_data in users_data:
        user = User(
            username=user_data['username'],
            email=user_data['email'],
            role_id=user_data['role_id'],
            status=StatusEnum.ACTIVE
        )
        user.set_password(user_data['password'])
        db.session.add(user)
   
    db.session.commit()
    print("✅ Initial data seeded successfully!")

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    return User.query.get(int(user_id))