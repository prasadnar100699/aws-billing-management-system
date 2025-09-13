#!/usr/bin/env python3
"""
Setup script for AWS Billing Management System
"""

import os
import sys
import subprocess
import mysql.connector
from mysql.connector import Error
import redis
from dotenv import load_dotenv

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_dependencies():
    """Install Python dependencies"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("✗ Failed to install dependencies")
        sys.exit(1)

def check_mysql_connection():
    """Check MySQL connection and create database if needed"""
    load_dotenv()
    
    host = os.getenv('DB_HOST', 'localhost')
    port = int(os.getenv('DB_PORT', 3306))
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'aws_billing_system')
    
    try:
        # Connect without database first
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        
        cursor = connection.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
        print(f"✓ Database '{database}' ready")
        
        # Check if database is empty
        cursor.execute(f"USE {database}")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        if not tables:
            print("Database is empty, will initialize schema")
            return True
        else:
            print(f"✓ Database has {len(tables)} tables")
            return False
            
    except Error as e:
        print(f"✗ MySQL connection failed: {e}")
        print("Please ensure MySQL is running and credentials are correct in .env file")
        sys.exit(1)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def check_redis_connection():
    """Check Redis connection"""
    load_dotenv()
    
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    try:
        r = redis.from_url(redis_url)
        r.ping()
        print("✓ Redis connection successful")
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
        print("Please ensure Redis is running")
        sys.exit(1)

def initialize_database():
    """Initialize database schema"""
    print("Initializing database schema...")
    try:
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            db.create_all()
            print("✓ Database schema created")
            
            # Seed initial data
            from app.utils.seed_data import seed_initial_data
            seed_initial_data()
            print("✓ Initial data seeded")
            
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        sys.exit(1)

def create_upload_directories():
    """Create necessary upload directories"""
    directories = [
        'uploads',
        'uploads/documents',
        'uploads/invoices',
        'uploads/invoices/pdfs',
        'uploads/usage_imports',
        'uploads/backups',
        'uploads/backups/database',
        'uploads/backups/documents',
        'uploads/backups/summaries',
        'logs'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    print("✓ Upload directories created")

def check_env_file():
    """Check if .env file exists and has required variables"""
    if not os.path.exists('.env'):
        print("Creating .env file from template...")
        if os.path.exists('.env.example'):
            import shutil
            shutil.copy('.env.example', '.env')
            print("✓ .env file created from .env.example")
            print("⚠️  Please update .env file with your actual configuration")
        else:
            print("✗ .env.example file not found")
            sys.exit(1)
    else:
        print("✓ .env file exists")

def main():
    """Main setup function"""
    print("AWS Billing Management System - Setup")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Check .env file
    check_env_file()
    
    # Install dependencies
    install_dependencies()
    
    # Check database connection
    need_init = check_mysql_connection()
    
    # Check Redis connection
    check_redis_connection()
    
    # Create directories
    create_upload_directories()
    
    # Initialize database if needed
    if need_init:
        initialize_database()
    
    print("\n" + "=" * 50)
    print("Setup completed successfully!")
    print("\nNext steps:")
    print("1. Update .env file with your actual configuration")
    print("2. Start Redis server: redis-server")
    print("3. Start Celery worker: celery -A celery_app.celery worker --loglevel=info")
    print("4. Start Flask app: python run.py")
    print("5. Access the API at http://localhost:5002")
    print("\nDefault admin credentials:")
    print("Email: admin@tejit.com")
    print("Password: Admin@123")

if __name__ == "__main__":
    main()