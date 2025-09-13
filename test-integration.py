#!/usr/bin/env python3
"""
Integration test script for AWS Billing Management System
"""

import requests
import json
import time
import sys

# Configuration
BACKEND_URL = "http://localhost:5002/api"
FRONTEND_URL = "http://localhost:3002"

def test_backend_health():
    """Test backend health endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Backend health check passed")
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
        response = requests.get(FRONTEND_URL, timeout=10)
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
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
        
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
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers, timeout=10)
        
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

def test_role_based_access(token):
    """Test role-based access control"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Super Admin access to users endpoint
        response = requests.get(f"{BACKEND_URL}/users", headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ Role-based access control working")
            return True
        else:
            print(f"❌ Role-based access failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Role-based access test failed: {e}")
        return False

def main():
    """Run all integration tests"""
    print("🧪 AWS Billing Management System - Integration Tests")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 5
    
    # Test 1: Backend Health
    if test_backend_health():
        tests_passed += 1
    
    # Test 2: Frontend Access
    if test_frontend_access():
        tests_passed += 1
    
    # Test 3: Authentication
    token = test_authentication()
    if token:
        tests_passed += 1
        
        # Test 4: Protected Endpoints
        if test_protected_endpoint(token):
            tests_passed += 1
        
        # Test 5: Role-based Access
        if test_role_based_access(token):
            tests_passed += 1
    
    print("\n" + "=" * 60)
    print(f"🎯 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("✅ All integration tests passed!")
        print("\n🚀 System is ready for use:")
        print(f"   • Frontend: {FRONTEND_URL}")
        print(f"   • Backend:  {BACKEND_URL}")
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