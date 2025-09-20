#!/usr/bin/env python3
"""
Supabase Connection Test Script

This script tests your Supabase database connection.
Run this after setting up your .env file with Supabase credentials.

Usage:
    python test_supabase_connection.py
"""

import os
import sys

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_supabase_connection():
    """Test Supabase database connection"""
    print("Testing Supabase connection...")
    print("=" * 40)

    # Get database URL
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        print("   Make sure your .env file contains the DATABASE_URL from Supabase")
        return False

    print(f"🔗 Connecting to: {database_url[:50]}...")

    try:
        # Create engine
        engine = create_engine(database_url)

        # Test connection
        with engine.connect() as conn:
            # Test basic connectivity
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print("✅ Database connection successful!")
            print(f"   PostgreSQL Version: {version.split(' ')[1]}")

            # Test if our tables exist
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('users', 'events', 'tickets')
                ORDER BY table_name
            """))

            tables = result.fetchall()
            existing_tables = [row[0] for row in tables]

            print(f"   Existing tables: {existing_tables}")

            expected_tables = ['users', 'events', 'tickets']
            missing_tables = [t for t in expected_tables if t not in existing_tables]

            if missing_tables:
                print(f"⚠️  Missing tables: {missing_tables}")
                print("   Run 'python app.py' once to create the tables")
            else:
                print("✅ All required tables exist")

        return True

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("- Check your DATABASE_URL in .env file")
        print("- Make sure the password is correct (not your account password)")
        print("- Verify your IP is allowed in Supabase dashboard")
        print("- Check if Supabase is experiencing outages")
        return False

def main():
    """Main test function"""
    success = test_supabase_connection()

    if success:
        print("\n🎉 Supabase connection test passed!")
        print("   Your Flask app should now work with Supabase.")
        print("   Run 'python app.py' to start your application.")
    else:
        print("\n❌ Supabase connection test failed.")
        print("   Check the troubleshooting steps above.")

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)