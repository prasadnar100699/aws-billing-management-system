#!/usr/bin/env python3
"""
Complete setup script for AWS Billing Management System
"""

import os
import sys
import subprocess
import mysql.connector
from mysql.connector import Error
import time

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def check_node():
    """Check if Node.js is available"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} detected")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ Node.js not found. Please install Node.js 18+ to run the frontend.")
    return False

def setup_mysql_database():
    """Setup MySQL database"""
    print("🗄️  Setting up MySQL database...")
    
    try:
        # Try to connect to MySQL
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password=''  # Default empty password
        )
        
        cursor = connection.cursor()
        
        # Create database
        cursor.execute("CREATE DATABASE IF NOT EXISTS aws_billing_system")
        print("✅ Database 'aws_billing_system' created/verified")
        
        # Run setup script
        cursor.execute("USE aws_billing_system")
        
        # Read and execute setup SQL
        with open('database/setup.sql', 'r') as f:
            sql_script = f.read()
            
        # Execute each statement
        for statement in sql_script.split(';'):
            if statement.strip():
                cursor.execute(statement)
        
        connection.commit()
        print("✅ Database schema created successfully")
        
    except Error as e:
        print(f"❌ MySQL setup failed: {e}")
        print("Please ensure MySQL is running and accessible")
        sys.exit(1)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def install_backend_dependencies():
    """Install Python dependencies"""
    print("📦 Installing backend dependencies...")
    try:
        os.chdir('backend')
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Backend dependencies installed successfully")
        os.chdir('..')
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install backend dependencies: {e}")
        sys.exit(1)

def install_frontend_dependencies():
    """Install npm dependencies"""
    print("📦 Installing frontend dependencies...")
    try:
        os.chdir('frontend')
        subprocess.check_call(['npm', 'install'])
        print("✅ Frontend dependencies installed successfully")
        os.chdir('..')
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install frontend dependencies: {e}")
        sys.exit(1)

def main():
    """Main setup function"""
    print("🚀 AWS Billing Management System - Complete Setup")
    print("=" * 60)
    
    # Check prerequisites
    check_python_version()
    if not check_node():
        sys.exit(1)
    
    # Setup database
    setup_mysql_database()
    
    # Install dependencies
    install_backend_dependencies()
    install_frontend_dependencies()
    
    print("\n" + "=" * 60)
    print("✅ Setup completed successfully!")
    print("\n🚀 To start the system:")
    print("1. Start backend: cd backend && python run.py")
    print("2. Start frontend: cd frontend && npm run dev")
    print("\n🌐 Access URLs:")
    print("   • Frontend: http://localhost:3002")
    print("   • Backend:  http://localhost:5002")
    print("\n📝 Demo Credentials:")
    print("   • Super Admin: admin@tejit.com / password123")
    print("   • Client Manager: manager@tejit.com / password123")
    print("   • Auditor: auditor@tejit.com / password123")

if __name__ == "__main__":
    main()