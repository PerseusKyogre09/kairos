#!/usr/bin/env python3
"""
Setup script for NFT Tickets feature
This script initializes the tickets table and creates some demo data
"""

import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app import app
from backend.models import db, User, Event, Ticket
from datetime import datetime, timedelta

def setup_tickets():
    """Setup tickets table and demo data"""
    print("🎫 Setting up NFT Tickets feature...")
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✓ Database tables created/updated")
            
            # Check if we have any users and events for demo tickets
            users = User.query.limit(3).all()
            events = Event.query.limit(3).all()
            
            if not users:
                print("⚠ No users found. Please register some users first.")
                return
                
            if not events:
                print("⚠ No events found. Please create some events first.")
                return
            
            # Create some demo tickets if none exist
            existing_tickets = Ticket.query.count()
            if existing_tickets == 0:
                print("📝 Creating demo tickets...")
                
                demo_tickets = []
                token_id = 1
                
                for i, event in enumerate(events[:3]):  # Create tickets for first 3 events
                    for j, user in enumerate(users[:2]):  # 2 tickets per event
                        if user.wallet_address:  # Only create tickets for users with wallet addresses
                            ticket_type = 'VIP' if j == 0 else 'Standard'
                            seat_info = f"Seat-{j + 1}"
                            
                            ticket = Ticket(
                                token_id=token_id,
                                event_id=event.id,
                                user_id=user.id,
                                wallet_address=user.wallet_address,
                                transaction_hash=f"0x{''.join([f'{ord(c):02x}' for c in f'demo{token_id}'])[:64]}",
                                seat_info=seat_info,
                                ticket_type=ticket_type
                            )
                            
                            # Mark some tickets as used for demo
                            if token_id % 3 == 0:
                                ticket.is_used = True
                            
                            demo_tickets.append(ticket)
                            token_id += 1
                
                # Add demo tickets to database
                for ticket in demo_tickets:
                    db.session.add(ticket)
                
                db.session.commit()
                print(f"✓ Created {len(demo_tickets)} demo tickets")
            else:
                print(f"✓ Found {existing_tickets} existing tickets")
            
            # Show summary
            total_tickets = Ticket.query.count()
            active_tickets = Ticket.query.filter_by(is_active=True, is_used=False).count()
            used_tickets = Ticket.query.filter_by(is_used=True).count()
            
            print(f"\n📊 Tickets Summary:")
            print(f"   Total tickets: {total_tickets}")
            print(f"   Active tickets: {active_tickets}")
            print(f"   Used tickets: {used_tickets}")
            
            # Show tickets by user
            print(f"\n👥 Tickets by User:")
            for user in users:
                user_tickets = Ticket.query.filter_by(user_id=user.id).count()
                if user_tickets > 0:
                    print(f"   {user.username}: {user_tickets} tickets")
            
            print(f"\n🎉 NFT Tickets feature setup complete!")
            print(f"💡 You can now:")
            print(f"   - View tickets in the 'My Tickets' section")
            print(f"   - Purchase new tickets for events")
            print(f"   - See unique NFT designs for each event")
            
        except Exception as e:
            print(f"✗ Error setting up tickets: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    setup_tickets()