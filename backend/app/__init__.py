from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config
import redis
import os

# Initialize extensions (no circular imports)
db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

# Initialize Redis client
redis_client = None

def create_app():
    app = Flask(__name__)
   
    # Load configuration from Config class
    app.config.from_object(Config)
   
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
   
    # Initialize Redis
    global redis_client
    try:
        redis_client = redis.from_url(app.config['REDIS_URL'])
        redis_client.ping()  # Test connection
        print("✅ Redis connected successfully")
    except Exception as e:
        print(f"⚠️  Redis connection failed: {e}")
        # Create a mock Redis client for development
        class MockRedis:
            def get(self, key): return None
            def set(self, key, value): return True
            def setex(self, key, time, value): return True
            def delete(self, key): return True
            def ping(self): return True
        redis_client = MockRedis()
   
    # Configure CORS
    cors_origins = app.config['CORS_ORIGINS'].split(',')
    CORS(app, origins=cors_origins, supports_credentials=True)
   
    # Register blueprints
    from app.auth import bp as auth_bp
    from app.users import bp as users_bp
    from app.clients import bp as clients_bp
    from app.services import bp as services_bp
    from app.invoices import bp as invoices_bp
    from app.usage import bp as usage_bp
    from app.documents import bp as documents_bp
    from app.reports import bp as reports_bp
    from app.notifications import bp as notifications_bp
    from app.analytics import bp as analytics_bp
    from app.health import bp as health_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(invoices_bp)
    app.register_blueprint(usage_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(health_bp)
   
    # Create tables and seed data
    with app.app_context():
        db.create_all()
        seed_initial_data()
   
    return app

def seed_initial_data():
    """Seed initial data if database is empty"""
    from app.models import Role, User, RoleModuleAccess, StatusEnum
   
    # Check if data already exists
    if Role.query.first():
        return
   
    print("🌱 Seeding initial data...")
   
    # Create roles
    super_admin = Role(role_name='Super Admin', description='Full system access with all permissions')
    client_manager = Role(role_name='Client Manager', description='Can manage assigned clients and generate invoices')
    auditor = Role(role_name='Auditor', description='Read-only access for reports and analytics')
    
    db.session.add_all([super_admin, client_manager, auditor])
    db.session.commit()  # Commit to get role_ids
   
    # Create module access permissions
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
        (super_admin.role_id, 'analytics', True, True, True, True),
       
        # Client Manager permissions
        (client_manager.role_id, 'dashboard', True, False, False, False),
        (client_manager.role_id, 'clients', True, True, True, False),
        (client_manager.role_id, 'services', True, False, False, False),
        (client_manager.role_id, 'invoices', True, True, True, False),
        (client_manager.role_id, 'usage_import', True, True, False, False),
        (client_manager.role_id, 'documents', True, True, False, False),
        (client_manager.role_id, 'reports', True, False, False, False),
        (client_manager.role_id, 'notifications', True, False, False, False),
        (client_manager.role_id, 'analytics', True, False, False, False),
       
        # Auditor permissions
        (auditor.role_id, 'dashboard', True, False, False, False),
        (auditor.role_id, 'clients', True, False, False, False),
        (auditor.role_id, 'invoices', True, False, False, False),
        (auditor.role_id, 'documents', True, False, False, False),
        (auditor.role_id, 'reports', True, False, False, False),
        (auditor.role_id, 'usage_import', True, False, False, False),
        (auditor.role_id, 'notifications', True, False, False, False),
        (auditor.role_id, 'analytics', True, False, False, False)
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
            'password': 'password',
            'role_id': super_admin.role_id
        },
        {
            'username': 'manager',
            'email': 'manager@tejit.com',
            'password': 'password',
            'role_id': client_manager.role_id
        },
        {
            'username': 'auditor',
            'email': 'auditor@tejit.com',
            'password': 'password',
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