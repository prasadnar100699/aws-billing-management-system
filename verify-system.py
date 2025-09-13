#!/usr/bin/env python3
"""
System verification script for AWS Billing Management System
"""

import requests
import mysql.connector
import time
import sys
import json

def test_database_connection():
    """Test database connection"""
    try:
        connection = mysql.connector.connect(
            host='202.71.157.170',
            port=3308,
            user='admin',
            password='admin@9955',
            database='aws_billing_system'
        )
        
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM roles")
        result = cursor.fetchone()
        
        print(f"✅ Database connection successful - {result[0]} roles found")
        
        # Check tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"✅ Database has {len(tables)} tables")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def test_backend_health():
    """Test backend health"""
    try:
        response = requests.get("http://localhost:5002/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend health check passed - Status: {data.get('status')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False

def test_frontend_access():
    """Test frontend accessibility"""
    try:
        response = requests.get("http://localhost:3002", timeout=10)
        if response.status_code == 200:
            print("✅ Frontend accessible")
            return True
        else:
            print(f"❌ Frontend access failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend access failed: {e}")
        return False

def test_authentication():
    """Test authentication flow"""
    try:
        # Test login
        login_data = {
            "email": "admin@tejit.com",
            "password": "password"
        }
        
        response = requests.post("http://localhost:5002/auth/login", json=login_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('token')
            if token:
                print("✅ Authentication successful")
                return token
            else:
                print("❌ Authentication failed: No token received")
                return None
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")
        return None

def test_protected_endpoint(token):
    """Test protected endpoint with JWT token"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("http://localhost:5002/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user')
            if user:
                print(f"✅ Protected endpoint access successful - User: {user.get('username')}")
                return True
            else:
                print("❌ Protected endpoint failed: No user data")
                return False
        else:
            print(f"❌ Protected endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Protected endpoint test failed: {e}")
        return False

def test_frontend_backend_integration():
    """Test frontend-backend integration"""
    try:
        # Test frontend API proxy
        login_data = {
            "email": "admin@tejit.com",
            "password": "password"
        }
        
        response = requests.post("http://localhost:3002/api/auth/login", json=login_data, timeout=10)
        
        if response.status_code == 200:
            print("✅ Frontend-Backend integration working")
            return True
        else:
            print(f"❌ Frontend-Backend integration failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend-Backend integration test failed: {e}")
        return False

def main():
    """Run all verification tests"""
    print("🧪 AWS Billing Management System - System Verification")
    print("=" * 70)
    
    tests_passed = 0
    total_tests = 6
    
    # Test 1: Database Connection
    if test_database_connection():
        tests_passed += 1
    
    # Test 2: Backend Health
    print("\n⏳ Waiting for backend to start...")
    time.sleep(5)
    if test_backend_health():
        tests_passed += 1
    
    # Test 3: Frontend Access
    print("\n⏳ Waiting for frontend to start...")
    time.sleep(5)
    if test_frontend_access():
        tests_passed += 1
    
    # Test 4: Authentication
    token = test_authentication()
    if token:
        tests_passed += 1
        
        # Test 5: Protected Endpoints
        if test_protected_endpoint(token):
            tests_passed += 1
    
    # Test 6: Frontend-Backend Integration
    if test_frontend_backend_integration():
        tests_passed += 1
    
    print("\n" + "=" * 70)
    print(f"🎯 Verification Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("✅ All verification tests passed!")
        print("\n🚀 System is ready for use:")
        print("   • Frontend: http://localhost:3002")
        print("   • Backend:  http://localhost:5002")
        print("   • Database: 202.71.157.170:3308")
        print("\n📝 Demo Credentials:")
        print("   • Super Admin: admin@tejit.com / password")
        print("   • Client Manager: manager@tejit.com / password")
        print("   • Auditor: auditor@tejit.com / password")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please check the system configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()