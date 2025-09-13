from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_mail import Mail
from celery import Celery
from config import Config
import redis
import logging
from logging.handlers import RotatingFileHandler
import os

db = SQLAlchemy()
login_manager = LoginManager()
mail = Mail()
redis_client = redis.Redis()

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    celery.conf.update(app.config)
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    
    # Configure CORS
    CORS(app, origins=app.config['CORS_ORIGINS'].split(','))
    
    # Configure Redis
    global redis_client
    redis_client = redis.from_url(app.config['REDIS_URL'])
    
    # Configure logging
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/aws_billing.log',
                                         maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('AWS Billing System startup')
    
    # Register blueprints
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)
    
    from app.users import bp as users_bp
    app.register_blueprint(users_bp)
    
    from app.clients import bp as clients_bp
    app.register_blueprint(clients_bp)
    
    from app.services import bp as services_bp
    app.register_blueprint(services_bp)
    
    from app.invoices import bp as invoices_bp
    app.register_blueprint(invoices_bp)
    
    from app.usage import bp as usage_bp
    app.register_blueprint(usage_bp)
    
    from app.documents import bp as documents_bp
    app.register_blueprint(documents_bp)
    
    from app.reports import bp as reports_bp
    app.register_blueprint(reports_bp)
    
    from app.notifications import bp as notifications_bp
    app.register_blueprint(notifications_bp)
    
    from app.analytics import bp as analytics_bp
    app.register_blueprint(analytics_bp)
    
    return app

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    return User.query.get(int(user_id))