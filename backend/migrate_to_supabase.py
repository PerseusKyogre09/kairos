#!/usr/bin/env python3
"""
Supabase Migration Script

This script migrates data from SQLite to Supabase.
Run this after setting up Supabase and testing the connection.

Usage:
    python migrate_to_supabase.py
"""

import os
import sys
from datetime import datetime

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker

# Import our models
from models import db, User, Event, Ticket

def get_sqlite_engine():
    """Create SQLite engine"""
    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'app.db')
    return create_engine(f'sqlite:///{sqlite_path}')

def get_supabase_engine():
    """Create Supabase engine from environment variables"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not found. Set it in your .env file")
    return create_engine(database_url)

def migrate_table_data(sqlite_session, supabase_session, model_class, table_name):
    """Migrate data for a specific table"""
    print(f"Migrating {table_name}...")

    # Get all records from SQLite
    sqlite_records = sqlite_session.query(model_class).all()
    print(f"Found {len(sqlite_records)} records in {table_name}")

    if not sqlite_records:
        print(f"No records to migrate for {table_name}")
        return

    # Clear existing data in Supabase (if any)
    supabase_session.query(model_class).delete()
    supabase_session.commit()

    # Migrate records
    migrated_count = 0
    for record in sqlite_records:
        try:
            # Create a new instance with the same data
            record_dict = record.__dict__.copy()

            # Remove SQLAlchemy internal fields
            record_dict.pop('_sa_instance_state', None)
            record_dict.pop('id', None)  # Let Supabase auto-generate IDs

            # Handle JSON fields that are stored as strings in SQLite
            if 'skills' in record_dict and record_dict['skills']:
                if isinstance(record_dict['skills'], str):
                    record_dict['skills'] = record_dict['skills']
                else:
                    import json
                    record_dict['skills'] = json.dumps(record_dict['skills'])

            if 'interests' in record_dict and record_dict['interests']:
                if isinstance(record_dict['interests'], str):
                    record_dict['interests'] = record_dict['interests']
                else:
                    import json
                    record_dict['interests'] = json.dumps(record_dict['interests'])

            # Create new record in Supabase
            new_record = model_class(**record_dict)
            supabase_session.add(new_record)
            migrated_count += 1

        except Exception as e:
            print(f"Error migrating record: {e}")
            continue

    try:
        supabase_session.commit()
        print(f"✅ Successfully migrated {migrated_count} records for {table_name}")
    except Exception as e:
        supabase_session.rollback()
        print(f"❌ Error committing {table_name} migration: {e}")
        raise

def main():
    """Main migration function"""
    print("Starting migration from SQLite to Supabase...")
    print("=" * 50)

    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()

    try:
        # Create engines
        print("Connecting to databases...")
        sqlite_engine = get_sqlite_engine()
        supabase_engine = get_supabase_engine()

        # Test connections
        with sqlite_engine.connect():
            print("✅ SQLite connection successful")

        with supabase_engine.connect():
            print("✅ Supabase connection successful")

        # Create sessions
        SQLiteSession = sessionmaker(bind=sqlite_engine)
        SupabaseSession = sessionmaker(bind=supabase_engine)

        sqlite_session = SQLiteSession()
        supabase_session = SupabaseSession()

        # Migrate data in order (respecting foreign keys)
        print("\nMigrating data...")

        # 1. Migrate Users first (no dependencies)
        migrate_table_data(sqlite_session, supabase_session, User, 'users')

        # 2. Migrate Events (depends on users)
        migrate_table_data(sqlite_session, supabase_session, Event, 'events')

        # 3. Migrate Tickets (depends on users and events)
        migrate_table_data(sqlite_session, supabase_session, Ticket, 'tickets')

        # Close sessions
        sqlite_session.close()
        supabase_session.close()

        print("\n" + "=" * 50)
        print("🎉 Migration completed successfully!")
        print("\nNext steps:")
        print("1. Test your application with Supabase")
        print("2. Update any hardcoded SQLite references")
        print("3. Consider enabling Row Level Security in Supabase")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nTroubleshooting:")
        print("- Run 'python test_supabase_connection.py' first")
        print("- Check your DATABASE_URL in .env")
        print("- Ensure Supabase database is accessible")
        sys.exit(1)

if __name__ == "__main__":
    main()