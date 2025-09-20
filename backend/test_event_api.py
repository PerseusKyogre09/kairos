#!/usr/bin/env python3
"""
Test script for Event Management API endpoints
Tests all CRUD operations for Task 2.2
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:5000"

def test_auth_and_get_token():
    """Test authentication and get JWT token"""
    print("=== Testing Authentication ===")
    
    # Register a test user
    register_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        print(f"Register response: {response.status_code}")
        if response.status_code == 201:
            print("✓ User registered successfully")
        elif response.status_code == 400 and "already exists" in response.text:
            print("✓ User already exists, continuing...")
        else:
            print(f"✗ Registration failed: {response.text}")
    except Exception as e:
        print(f"✗ Registration error: {e}")
    
    # Login to get token
    login_data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json()['access_token']
            print("✓ Login successful, token obtained")
            return token
        else:
            print(f"✗ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Login error: {e}")
        return None

def test_create_event(token):
    """Test event creation (POST /events)"""
    print("\n=== Testing Event Creation ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test data for event creation
    event_data = {
        "title": "Test Blockchain Conference",
        "description": "A test event for blockchain enthusiasts",
        "start_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=31)).isoformat(),
        "ticket_price": 0.1,
        "capacity": 100,
        "location": "Virtual Event"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/events/", json=event_data, headers=headers)
        print(f"Create event response: {response.status_code}")
        
        if response.status_code == 201:
            event = response.json()['event']
            print(f"✓ Event created successfully with ID: {event['id']}")
            return event['id']
        else:
            print(f"✗ Event creation failed: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Event creation error: {e}")
        return None

def test_get_events():
    """Test getting list of events (GET /events)"""
    print("\n=== Testing Get Events List ===")
    
    try:
        # Test without pagination
        response = requests.get(f"{BASE_URL}/events/")
        print(f"Get events response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Events retrieved successfully. Count: {len(data['events'])}")
            print(f"✓ Pagination info: {data['pagination']}")
            return True
        else:
            print(f"✗ Get events failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Get events error: {e}")
        return False

def test_get_single_event(event_id):
    """Test getting single event (GET /events/<id>)"""
    print(f"\n=== Testing Get Single Event (ID: {event_id}) ===")
    
    try:
        response = requests.get(f"{BASE_URL}/events/{event_id}")
        print(f"Get single event response: {response.status_code}")
        
        if response.status_code == 200:
            event = response.json()['event']
            print(f"✓ Event retrieved successfully: {event['title']}")
            return True
        else:
            print(f"✗ Get single event failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Get single event error: {e}")
        return False

def test_update_event(event_id, token):
    """Test updating event (PUT /events/<id>)"""
    print(f"\n=== Testing Update Event (ID: {event_id}) ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    update_data = {
        "title": "Updated Blockchain Conference",
        "description": "Updated description for the blockchain event",
        "ticket_price": 0.15,
        "capacity": 150
    }
    
    try:
        response = requests.put(f"{BASE_URL}/events/{event_id}", json=update_data, headers=headers)
        print(f"Update event response: {response.status_code}")
        
        if response.status_code == 200:
            event = response.json()['event']
            print(f"✓ Event updated successfully: {event['title']}")
            return True
        else:
            print(f"✗ Event update failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Event update error: {e}")
        return False

def test_delete_event(event_id, token):
    """Test deleting event (DELETE /events/<id>)"""
    print(f"\n=== Testing Delete Event (ID: {event_id}) ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.delete(f"{BASE_URL}/events/{event_id}", headers=headers)
        print(f"Delete event response: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ Event deleted successfully")
            return True
        else:
            print(f"✗ Event deletion failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Event deletion error: {e}")
        return False

def test_validation():
    """Test input validation"""
    print("\n=== Testing Input Validation ===")
    
    # This should fail without authentication
    try:
        response = requests.post(f"{BASE_URL}/events/", json={})
        if response.status_code == 401:
            print("✓ Authentication required for event creation")
        else:
            print(f"✗ Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"✗ Validation test error: {e}")

def main():
    """Run all tests"""
    print("Starting Event Management API Tests...")
    print("Make sure the Flask server is running on http://127.0.0.1:5000")
    
    # Test authentication
    token = test_auth_and_get_token()
    if not token:
        print("✗ Cannot proceed without authentication token")
        return
    
    # Test event creation
    event_id = test_create_event(token)
    if not event_id:
        print("✗ Cannot proceed without created event")
        return
    
    # Test getting events list
    test_get_events()
    
    # Test getting single event
    test_get_single_event(event_id)
    
    # Test updating event
    test_update_event(event_id, token)
    
    # Test validation
    test_validation()
    
    # Test deleting event (do this last)
    test_delete_event(event_id, token)
    
    print("\n=== All Tests Completed ===")

if __name__ == "__main__":
    main()