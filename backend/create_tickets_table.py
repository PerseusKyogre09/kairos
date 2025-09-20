#!/usr/bin/env python3
"""
Create tickets table for NFT ticket tracking
Run this script to add the tickets table to your database
"""

from app import app
from models import db, Ticket

def create_tickets_table():
    """Create the tickets table"""
    with app.app_context():
        try:
            # Create the tickets table
            db.create_all()
            print("✓ Tickets table created successfully!")
            
            # Check if table exists
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'tickets' in tables:
                print("✓ Tickets table confirmed in database")
                
                # Show table structure
                columns = inspector.get_columns('tickets')
                print("\nTickets table structure:")
                for column in columns:
                    print(f"  - {column['name']}: {column['type']}")
            else:
                print("✗ Tickets table not found")
                
        except Exception as e:
            print(f"✗ Error creating tickets table: {e}")

if __name__ == "__main__":
    print("Creating tickets table...")
    create_tickets_table()