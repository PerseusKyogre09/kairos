#!/usr/bin/env python3
"""
Test script for Events API endpoints
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:5000'

def test_get_events():
    """Test GET /events endpoint"""
    print("Testing GET /events...")
    try:
        response = requests.get(f'{BASE_URL}/events')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data['events'])} events")
            print("✓ GET /events works")
        else:
            print(f"✗ GET /events failed: {response.text}")
    except Exception as e:
        print(f"✗ GET /events error: {e}")

def test_create_event():
    """Test POST /events endpoint (requires authentication)"""
    print("\nTesting POST /events (without auth - should fail)...")
    try:
        event_data = {
            'title': 'Test Event',
            'description': 'This is a test event',
            'start_date': (datetime.utcnow() + timedelta(days=1)).isoformat(),
            'ticket_price': 0.1,
            'capacity': 100
        }
        response = requests.post(f'{BASE_URL}/events', json=event_data)
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print("✓ POST /events correctly requires authentication")
        else:
            print(f"✗ POST /events unexpected response: {response.text}")
    except Exception as e:
        print(f"✗ POST /events error: {e}")

def test_health():
    """Test health endpoint"""
    print("\nTesting health endpoint...")
    try:
        response = requests.get(f'{BASE_URL}/health')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✓ Health endpoint works")
        else:
            print(f"✗ Health endpoint failed: {response.text}")
    except Exception as e:
        print(f"✗ Health endpoint error: {e}")

if __name__ == '__main__':
    print("Starting Events API tests...")
    test_health()
    test_get_events()
    test_create_event()
    print("\nTest completed!")