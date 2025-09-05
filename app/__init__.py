from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from config import config
import os

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()

def create_app(config_name=None):
    """Application factory pattern."""
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    
    # Create upload folders
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.clients import clients_bp
    from app.routes.invoices import invoices_bp
    from app.routes.services import services_bp
    from app.routes.reports import reports_bp
    from app.routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(clients_bp, url_prefix='/clients')
    app.register_blueprint(invoices_bp, url_prefix='/invoices')
    app.register_blueprint(services_bp, url_prefix='/services')
    app.register_blueprint(reports_bp, url_prefix='/reports')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    
    # Main routes
    @app.route('/')
    def index():
        from flask import redirect, url_for
        from flask_jwt_extended import jwt_required, get_jwt_identity
        return redirect(url_for('auth.dashboard'))
    
    return app