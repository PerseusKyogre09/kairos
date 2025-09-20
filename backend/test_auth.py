#!/usr/bin/env python3
"""
Test script for authentication endpoints
"""
import requests
import json

BASE_URL = 'http://127.0.0.1:5000'

def test_registration():
    """Test user registration"""
    print("Testing user registration...")

    user_data = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'testpass123',
        'first_name': 'Test',
        'last_name': 'User'
    }

    response = requests.post(f'{BASE_URL}/auth/register', json=user_data)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 201:
        print("✅ Registration successful")
        return True
    else:
        print("❌ Registration failed")
        return False

def test_login():
    """Test user login"""
    print("\nTesting user login...")

    login_data = {
        'username': 'testuser',
        'password': 'testpass123'
    }

    response = requests.post(f'{BASE_URL}/auth/login', json=login_data)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 200:
        print("✅ Login successful")
        data = response.json()
        return data.get('access_token'), data.get('refresh_token')
    else:
        print("❌ Login failed")
        return None, None

def test_profile(access_token):
    """Test profile endpoint"""
    print("\nTesting profile endpoint...")

    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(f'{BASE_URL}/auth/profile', headers=headers)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 200:
        print("✅ Profile access successful")
        return True
    else:
        print("❌ Profile access failed")
        return False

def test_refresh_token(refresh_token):
    """Test token refresh"""
    print("\nTesting token refresh...")

    headers = {'Authorization': f'Bearer {refresh_token}'}
    response = requests.post(f'{BASE_URL}/auth/refresh', headers=headers)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 200:
        print("✅ Token refresh successful")
        return True
    else:
        print("❌ Token refresh failed")
        return False

def test_health():
    """Test health endpoint"""
    print("\nTesting health endpoint...")

    response = requests.get(f'{BASE_URL}/health')

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 200:
        print("✅ Health check successful")
        return True
    else:
        print("❌ Health check failed")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Authentication API Tests")
    print("=" * 50)

    # Test health endpoint
    if not test_health():
        print("❌ Health check failed, aborting tests")
        return

    # Test registration
    if not test_registration():
        print("❌ Registration failed, aborting tests")
        return

    # Test login
    access_token, refresh_token = test_login()
    if not access_token:
        print("❌ Login failed, aborting tests")
        return

    # Test profile access
    if not test_profile(access_token):
        print("❌ Profile access failed")

    # Test token refresh
    if not test_refresh_token(refresh_token):
        print("❌ Token refresh failed")

    print("\n" + "=" * 50)
    print("🎉 Authentication API tests completed!")

if __name__ == '__main__':
    main()