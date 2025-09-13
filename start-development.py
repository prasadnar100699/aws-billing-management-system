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
    time.sleep(3)  # Wait for backend to start
    try:
        os.chdir("frontend")
        subprocess.run(["npm", "run", "dev"], check=True)
    except Exception as e:
        print(f"❌ Frontend failed: {e}")

def main():
    """Main function to start both servers"""
    print("🚀 AWS Billing Management System - Development Mode")
    print("=" * 70)
    
    # Create threads for both servers
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    
    try:
        # Start backend first
        backend_thread.start()
        
        # Wait a moment then start frontend
        time.sleep(2)
        frontend_thread.start()
        
        print("\n🎯 System Status:")
        print("   • Backend:  http://localhost:5002")
        print("   • Frontend: http://localhost:3002")
        print("   • API:      http://localhost:5002/auth")
        print("\n📝 Demo Credentials:")
        print("   • Super Admin: admin@tejit.com / password123")
        print("   • Client Manager: manager@tejit.com / password123")
        print("   • Auditor: auditor@tejit.com / password123")
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