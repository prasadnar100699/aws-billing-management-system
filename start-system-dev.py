#!/usr/bin/env python3
"""
Development startup script for AWS Billing Management System
"""

import os
import sys
import subprocess
import threading
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
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
    
    print("❌ Node.js not found. Please install Node.js 18+")
    return False

def setup_database():
    """Setup database"""
    print("🗄️  Setting up database...")
    try:
        os.chdir("backend")
        result = subprocess.run([sys.executable, "database/init_db.py"], check=True)
        os.chdir("..")
        print("✅ Database setup completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Database setup failed: {e}")
        os.chdir("..")
        return False

def install_backend_deps():
    """Install backend dependencies"""
    print("📦 Installing backend dependencies...")
    try:
        os.chdir("backend")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        os.chdir("..")
        print("✅ Backend dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Backend dependency installation failed: {e}")
        os.chdir("..")
        return False

def install_frontend_deps():
    """Install frontend dependencies"""
    print("📦 Installing frontend dependencies...")
    try:
        os.chdir("frontend")
        subprocess.check_call(["npm", "install"])
        os.chdir("..")
        print("✅ Frontend dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend dependency installation failed: {e}")
        os.chdir("..")
        return False

def run_backend():
    """Run the backend server"""
    print("🔧 Starting Backend Server on port 5002...")
    try:
        os.chdir("backend")
        subprocess.run([sys.executable, "run.py"], check=True)
    except Exception as e:
        print(f"❌ Backend failed: {e}")

def run_frontend():
    """Run the frontend server"""
    print("🎨 Starting Frontend Server on port 3002...")
    time.sleep(5)  # Wait for backend to start
    try:
        os.chdir("frontend")
        subprocess.run(["npm", "run", "dev"], check=True)
    except Exception as e:
        print(f"❌ Frontend failed: {e}")

def main():
    """Main function"""
    print("🚀 AWS Billing Management System - Development Setup")
    print("=" * 70)
    
    # Check prerequisites
    check_python_version()
    if not check_node():
        sys.exit(1)
    
    # Setup database
    if not setup_database():
        print("❌ Database setup failed. Please check your MySQL connection.")
        sys.exit(1)
    
    # Install dependencies
    if not install_backend_deps():
        sys.exit(1)
    
    if not install_frontend_deps():
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("🎯 Starting Development Servers...")
    print("=" * 70)
    
    # Create threads for both servers
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    
    try:
        # Start backend first
        backend_thread.start()
        
        # Wait then start frontend
        time.sleep(3)
        frontend_thread.start()
        
        print("\n🎯 System Status:")
        print("   • Backend:  http://localhost:5002")
        print("   • Frontend: http://localhost:3002")
        print("   • Database: 202.71.157.170:3308")
        print("\n📝 Demo Credentials:")
        print("   • Super Admin: admin@tejit.com / password")
        print("   • Client Manager: manager@tejit.com / password")
        print("   • Auditor: auditor@tejit.com / password")
        print("\n⚠️  Press Ctrl+C to stop both servers")
        print("=" * 70)
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down servers...")
        print("✅ System stopped successfully")

if __name__ == "__main__":
    main()