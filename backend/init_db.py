#!/usr/bin/env python3
"""
Database initialization script
"""
from app import app, db
from models import User, Event  # Import models to ensure they're registered

def init_db():
    """Initialize the database and create all tables"""
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("Database tables created successfully!")
        
        # Print table info for verification
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"Created tables: {tables}")

if __name__ == '__main__':
    init_db()