#!/usr/bin/env python3
"""
Start script for AWS Billing Management System Backend
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "backend/requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)

def setup_environment():
    """Setup environment variables"""
    env_file = Path("backend/.env")
    env_example = Path("backend/.env.example")
    
    if not env_file.exists() and env_example.exists():
        print("📝 Creating .env file from .env.example...")
        import shutil
        shutil.copy(env_example, env_file)
        print("✅ .env file created")
        print("⚠️  Please update backend/.env with your actual configuration")

def start_flask_app():
    """Start the Flask application"""
    print("🚀 Starting Flask backend on port 5002...")
    
    # Change to backend directory
    os.chdir("backend")
    
    # Set environment variables
    os.environ['FLASK_APP'] = 'run.py'
    os.environ['FLASK_ENV'] = 'development'
    
    try:
        # Start Flask app
        subprocess.run([sys.executable, "run.py"], check=True)
    except KeyboardInterrupt:
        print("\n👋 Backend server stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start Flask app: {e}")
        sys.exit(1)

def main():
    """Main function"""
    print("🏗️  AWS Billing Management System - Backend Startup")
    print("=" * 60)
    
    # Check Python version
    check_python_version()
    
    # Setup environment
    setup_environment()
    
    # Install dependencies
    install_dependencies()
    
    print("\n" + "=" * 60)
    print("🎯 Backend Configuration:")
    print("   • Flask App: http://localhost:5002")
    print("   • API Base: http://localhost:5002/api")
    print("   • Frontend: http://localhost:3002")
    print("=" * 60)
    
    # Start Flask app
    start_flask_app()

if __name__ == "__main__":
    main()