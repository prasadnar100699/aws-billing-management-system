import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-aws-billing-2024'
   
    # Database configuration - Live MySQL
    DB_HOST = os.environ.get('DB_HOST') or '202.71.157.170'
    DB_PORT = os.environ.get('DB_PORT') or '3308'
    DB_NAME = os.environ.get('DB_NAME') or 'aws_billing_system'
    DB_USER = os.environ.get('DB_USER') or 'admin'
    DB_PASSWORD = os.environ.get('DB_PASSWORD') or 'admin@9955'
   
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 20,
        'max_overflow': 0
    }
   
    # Upload configuration
    UPLOAD_DIR = os.environ.get('UPLOAD_DIR') or './uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
   
    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS') or 'http://localhost:3002'
   
    # Frontend URL
    NEXT_PUBLIC_APP_URL = os.environ.get('NEXT_PUBLIC_APP_URL') or 'http://localhost:3002'