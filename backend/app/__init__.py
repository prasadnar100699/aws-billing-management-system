from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI', 'mysql+pymysql://root:@localhost/aws_billing_system')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', app.config['SECRET_KEY'])
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    
    # Configure CORS
    cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3002').split(',')
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
    from app.models import Role, User, RoleModuleAccess
    
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
    
    for role_data in roles_data:
        role = Role(
            role_name=role_data['role_name'],
            description=role_data['description']
        )
        db.session.add(role)
    
    db.session.commit()
    
    # Create module access permissions
    permissions_data = [
        # Super Admin permissions
        (1, 'dashboard', True, True, True, True),
        (1, 'clients', True, True, True, True),
        (1, 'users', True, True, True, True),
        (1, 'roles', True, True, True, True),
        (1, 'services', True, True, True, True),
        (1, 'invoices', True, True, True, True),
        (1, 'usage_import', True, True, True, True),
        (1, 'documents', True, True, True, True),
        (1, 'reports', True, True, True, True),
        (1, 'notifications', True, True, True, True),
        
        # Client Manager permissions
        (2, 'dashboard', True, False, False, False),
        (2, 'clients', True, True, True, False),
        (2, 'services', True, False, False, False),
        (2, 'invoices', True, True, True, False),
        (2, 'usage_import', True, True, False, False),
        (2, 'documents', True, True, False, False),
        (2, 'reports', True, False, False, False),
        (2, 'notifications', True, False, False, False),
        
        # Auditor permissions
        (3, 'dashboard', True, False, False, False),
        (3, 'clients', True, False, False, False),
        (3, 'invoices', True, False, False, False),
        (3, 'documents', True, False, False, False),
        (3, 'reports', True, False, False, False)
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
            'role_id': 1
        },
        {
            'username': 'manager',
            'email': 'manager@tejit.com',
            'password': 'Admin@123',
            'role_id': 2
        },
        {
            'username': 'auditor',
            'email': 'auditor@tejit.com',
            'password': 'Admin@123',
            'role_id': 3
        }
    ]
    
    for user_data in users_data:
        user = User(
            username=user_data['username'],
            email=user_data['email'],
            role_id=user_data['role_id'],
            status='active'
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