#!/usr/bin/env python3
"""
Start script for AWS Billing Management System Frontend
"""

import os
import sys
import subprocess
from pathlib import Path

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

def install_dependencies():
    """Install npm dependencies"""
    print("📦 Installing npm dependencies...")
    try:
        subprocess.check_call(['npm', 'install'], cwd='frontend')
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)

def setup_environment():
    """Setup environment variables"""
    env_file = Path("frontend/.env.local")
    
    if not env_file.exists():
        print("📝 Creating .env.local file...")
        env_content = """NEXT_PUBLIC_API_URL=http://localhost:5002/api
JWT_SECRET=your-jwt-secret-key-here
"""
        env_file.write_text(env_content)
        print("✅ .env.local file created")

def start_next_app():
    """Start the Next.js application"""
    print("🚀 Starting Next.js frontend on port 3002...")
    
    try:
        # Start Next.js app
        subprocess.run(['npm', 'run', 'dev'], cwd='frontend', check=True)
    except KeyboardInterrupt:
        print("\n👋 Frontend server stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start Next.js app: {e}")
        sys.exit(1)

def main():
    """Main function"""
    print("🎨 AWS Billing Management System - Frontend Startup")
    print("=" * 60)
    
    # Check Node.js
    if not check_node():
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Install dependencies
    install_dependencies()
    
    print("\n" + "=" * 60)
    print("🎯 Frontend Configuration:")
    print("   • Next.js App: http://localhost:3002")
    print("   • API Backend: http://localhost:5002/api")
    print("   • Environment: Development")
    print("=" * 60)
    
    # Start Next.js app
    start_next_app()

if __name__ == "__main__":
    main()