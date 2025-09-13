#!/usr/bin/env python3
"""
Complete system startup script for AWS Billing Management System
"""

import os
import sys
import subprocess
import threading
import time
from pathlib import Path

def check_docker():
    """Check if Docker is available"""
    try:
        subprocess.run(['docker', '--version'], capture_output=True, check=True)
        subprocess.run(['docker-compose', '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def start_with_docker():
    """Start the system using Docker Compose"""
    print("🐳 Starting with Docker Compose...")
    try:
        # Build and start all services
        subprocess.run(['docker-compose', 'up', '--build', '-d'], check=True)
        
        print("\n✅ System started successfully with Docker!")
        print("🎯 Services:")
        print("   • Frontend: http://localhost:3002")
        print("   • Backend:  http://localhost:5002")
        print("   • MySQL:    localhost:3308")
        print("   • Redis:    localhost:6379")
        print("\n📝 Demo Credentials:")
        print("   • Super Admin: admin@tejit.com / password")
        print("   • Client Manager: manager@tejit.com / password")
        print("   • Auditor: auditor@tejit.com / password")
        print("\n🔧 Management Commands:")
        print("   • View logs: docker-compose logs -f")
        print("   • Stop system: docker-compose down")
        print("   • Restart: docker-compose restart")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Docker startup failed: {e}")
        sys.exit(1)

def start_development():
    """Start the system in development mode"""
    print("🛠️  Starting in development mode...")
    
    def run_backend():
        print("🔧 Starting Backend Server...")
        os.chdir("backend")
        try:
            subprocess.run([sys.executable, "run.py"], check=True)
        except Exception as e:
            print(f"❌ Backend failed: {e}")

    def run_frontend():
        print("🎨 Starting Frontend Server...")
        time.sleep(3)  # Wait for backend to start
        os.chdir("frontend")
        try:
            subprocess.run(["npm", "run", "dev"], check=True)
        except Exception as e:
            print(f"❌ Frontend failed: {e}")

    # Create threads for both servers
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    
    try:
        # Start backend first
        backend_thread.start()
        
        # Wait a moment then start frontend
        time.sleep(2)
        frontend_thread.start()
        
        print("\n🎯 Development System Status:")
        print("   • Backend:  http://localhost:5002")
        print("   • Frontend: http://localhost:3002")
        print("   • API:      http://localhost:5002/api")
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

def main():
    """Main function to start the system"""
    print("🚀 AWS Billing Management System - Complete Startup")
    print("=" * 70)
    
    # Check if Docker is available
    if check_docker():
        print("🐳 Docker detected. Choose startup method:")
        print("1. Docker Compose (Recommended for production)")
        print("2. Development mode (Local servers)")
        
        choice = input("\nEnter your choice (1 or 2): ").strip()
        
        if choice == '1':
            start_with_docker()
        elif choice == '2':
            start_development()
        else:
            print("Invalid choice. Starting with Docker Compose...")
            start_with_docker()
    else:
        print("🛠️  Docker not found. Starting in development mode...")
        start_development()

if __name__ == "__main__":
    main()