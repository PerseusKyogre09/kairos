#!/usr/bin/env python3
"""
Render Deployment Test Script

This script tests your application locally to ensure it will work on Render.
Run this before deploying to catch issues early.

Usage:
    python test_render_deployment.py
"""

import os
import sys
import requests
import subprocess
import time

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_environment():
    """Test environment setup"""
    print("Testing environment setup...")
    print("=" * 40)

    # Check Python version
    python_version = sys.version_info
    print(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")

    if python_version.major != 3 or python_version.minor < 12:
        print("❌ Python version should be 3.12+ for Render compatibility")
        return False
    else:
        print("✅ Python version is compatible")

    # Check if .env exists
    if os.path.exists('.env'):
        print("✅ .env file exists")
    else:
        print("⚠️  .env file not found - using defaults")

    # Check DATABASE_URL
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print("✅ DATABASE_URL is set")
        if 'supabase' in database_url.lower():
            print("✅ Using Supabase database")
        elif 'sqlite' in database_url.lower():
            print("⚠️  Using SQLite - consider upgrading to PostgreSQL for production")
        else:
            print("✅ Using external database")
    else:
        print("⚠️  DATABASE_URL not set - will use SQLite fallback")

    return True

def test_imports():
    """Test that all imports work"""
    print("\nTesting imports...")
    print("=" * 40)

    try:
        import flask
        print(f"✅ Flask {flask.__version__}")

        import flask_sqlalchemy
        print(f"✅ Flask-SQLAlchemy {flask_sqlalchemy.__version__}")

        import sqlalchemy
        print(f"✅ SQLAlchemy {sqlalchemy.__version__}")

        import flask_jwt_extended
        print(f"✅ Flask-JWT-Extended {flask_jwt_extended.__version__}")

        import psycopg2
        print("✅ psycopg2-binary available")

        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_app_creation():
    """Test that the Flask app can be created"""
    print("\nTesting Flask app creation...")
    print("=" * 40)

    try:
        from app import app
        print("✅ Flask app created successfully")

        # Test configuration
        with app.app_context():
            print(f"✅ Database URI: {app.config['SQLALCHEMY_DATABASE_URI'][:50]}...")
            print(f"✅ JWT secret configured: {'Yes' if app.config.get('JWT_SECRET_KEY') else 'No'}")

        return True
    except Exception as e:
        print(f"❌ App creation failed: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    print("=" * 40)

    try:
        from app import app, db

        with app.app_context():
            # Try to connect to the database
            db.engine.execute(db.text('SELECT 1'))
            print("✅ Database connection successful")

            # Check if tables exist
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"✅ Found {len(tables)} tables: {tables}")

            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_routes():
    """Test that key routes are available"""
    print("\nTesting routes...")
    print("=" * 40)

    try:
        from app import app

        with app.test_client() as client:
            # Test health endpoint
            response = client.get('/health')
            if response.status_code == 200:
                print("✅ Health endpoint works")
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
                return False

            # Test events endpoint (may require auth)
            response = client.get('/events')
            if response.status_code in [200, 401, 422]:  # 401/422 are expected without auth
                print("✅ Events endpoint accessible")
            else:
                print(f"⚠️  Events endpoint: {response.status_code} (may require auth)")

        return True
    except Exception as e:
        print(f"❌ Route testing failed: {e}")
        return False

def main():
    """Main test function"""
    print("Render Deployment Test")
    print("=" * 50)

    tests = [
        test_environment,
        test_imports,
        test_app_creation,
        test_database_connection,
        test_routes
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print("=" * 50)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Your app should deploy successfully to Render.")
        print("\nNext steps:")
        print("1. Commit your changes: git add . && git commit -m 'Fix Render deployment'")
        print("2. Push to trigger deployment: git push")
        print("3. Monitor Render dashboard for deployment status")
    else:
        print("❌ Some tests failed. Please fix the issues above before deploying.")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)