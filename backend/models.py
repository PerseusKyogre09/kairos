from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and user management"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Profile fields
    bio = db.Column(db.Text)
    wallet_address = db.Column(db.String(42), unique=True)  # Ethereum address format
    profile_image_url = db.Column(db.String(500))
    location = db.Column(db.String(100))
    website = db.Column(db.String(200))
    skills = db.Column(db.Text)  # JSON string of skills array
    interests = db.Column(db.Text)  # JSON string of interests array
    linkedin_url = db.Column(db.String(200))
    twitter_handle = db.Column(db.String(50))
    github_username = db.Column(db.String(50))
    is_profile_public = db.Column(db.Boolean, default=True)
    wallet_verified = db.Column(db.Boolean, default=False)

    def __init__(self, username, email, password, first_name=None, last_name=None):
        self.username = username
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.set_password(password)
        # Initialize profile fields
        self.skills = '[]'
        self.interests = '[]'

    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the user's password"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert user object to dictionary for JSON responses"""
        import json
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            # Profile fields
            'bio': self.bio,
            'wallet_address': self.wallet_address,
            'profile_image_url': self.profile_image_url,
            'location': self.location,
            'website': self.website,
            'skills': json.loads(self.skills) if self.skills else [],
            'interests': json.loads(self.interests) if self.interests else [],
            'linkedin_url': self.linkedin_url,
            'twitter_handle': self.twitter_handle,
            'github_username': self.github_username,
            'is_profile_public': self.is_profile_public,
            'wallet_verified': self.wallet_verified
        }

    def add_skill(self, skill):
        """Add a skill to the user's skills list"""
        import json
        skills = json.loads(self.skills) if self.skills else []
        if skill not in skills:
            skills.append(skill)
            self.skills = json.dumps(skills)

    def remove_skill(self, skill):
        """Remove a skill from the user's skills list"""
        import json
        skills = json.loads(self.skills) if self.skills else []
        if skill in skills:
            skills.remove(skill)
            self.skills = json.dumps(skills)

    def add_interest(self, interest):
        """Add an interest to the user's interests list"""
        import json
        interests = json.loads(self.interests) if self.interests else []
        if interest not in interests:
            interests.append(interest)
            self.interests = json.dumps(interests)

    def remove_interest(self, interest):
        """Remove an interest from the user's interests list"""
        import json
        interests = json.loads(self.interests) if self.interests else []
        if interest in interests:
            interests.remove(interest)
            self.interests = json.dumps(interests)

    def verify_wallet_signature(self, message, signature):
        """Verify that a signature was signed by this user's wallet"""
        from eth_account.messages import encode_defunct_message
        from eth_account import Account

        if not self.wallet_address:
            return False

        try:
            # Encode the message for verification (personal_sign uses defunct message format)
            encoded_message = encode_defunct_message(text=message)
            # Recover the address from the signature
            recovered_address = Account.recover_message(encoded_message, signature=signature)
            # Check if it matches the user's wallet address
            return recovered_address.lower() == self.wallet_address.lower()
        except Exception as e:
            print(f"Signature verification error: {e}")
            return False

    def __repr__(self):
        return f'<User {self.username}>'


class Event(db.Model):
    """Event model for event management"""
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime)
    ticket_price = db.Column(db.Float, nullable=False, default=0.0)  # Price in ETH
    capacity = db.Column(db.Integer, nullable=False)
    location = db.Column(db.String(300))
    organizer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with User (organizer)
    organizer = db.relationship('User', backref=db.backref('events', lazy=True))

    def __init__(self, title, description, start_date, ticket_price, capacity,
                 organizer_id, location=None, end_date=None):
        self.title = title
        self.description = description
        self.start_date = start_date
        self.end_date = end_date
        self.ticket_price = ticket_price
        self.capacity = capacity
        self.location = location
        self.organizer_id = organizer_id

    def to_dict(self):
        """Convert event object to dictionary for JSON responses"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'ticket_price': self.ticket_price,
            'capacity': self.capacity,
            'location': self.location,
            'organizer_id': self.organizer_id,
            'organizer': {
                'id': self.organizer.id,
                'username': self.organizer.username,
                'email': self.organizer.email,
                'wallet_address': self.organizer.wallet_address
            } if self.organizer else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Event {self.title}>'


class Ticket(db.Model):
    """Ticket model for tracking NFT tickets (offline mode support)"""
    __tablename__ = 'tickets'

    id = db.Column(db.Integer, primary_key=True)
    token_id = db.Column(db.Integer, unique=True, nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    wallet_address = db.Column(db.String(42), nullable=False)
    transaction_hash = db.Column(db.String(66))  # Blockchain transaction hash
    seat_info = db.Column(db.String(50), default='General Admission')
    ticket_type = db.Column(db.String(20), default='Standard')  # Standard, VIP, etc.
    is_used = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    event = db.relationship('Event', backref=db.backref('tickets', lazy=True))
    user = db.relationship('User', backref=db.backref('tickets', lazy=True))

    def __init__(self, token_id, event_id, user_id, wallet_address, 
                 transaction_hash=None, seat_info='General Admission', ticket_type='Standard'):
        self.token_id = token_id
        self.event_id = event_id
        self.user_id = user_id
        self.wallet_address = wallet_address
        self.transaction_hash = transaction_hash
        self.seat_info = seat_info
        self.ticket_type = ticket_type

    def to_dict(self):
        """Convert ticket object to dictionary for JSON responses"""
        return {
            'id': self.id,
            'token_id': self.token_id,
            'event_id': self.event_id,
            'user_id': self.user_id,
            'wallet_address': self.wallet_address,
            'transaction_hash': self.transaction_hash,
            'seat_info': self.seat_info,
            'ticket_type': self.ticket_type,
            'is_used': self.is_used,
            'is_active': self.is_active,
            'purchase_date': self.purchase_date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'event': self.event.to_dict() if self.event else None,
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'wallet_address': self.user.wallet_address
            } if self.user else None
        }

    def to_blockchain_format(self):
        """Convert to blockchain-compatible format"""
        return {
            'token_id': self.token_id,
            'event_id': self.event_id,
            'event_contract': '0x5FbDB2315678afecb367f032d93F642f64180aa3',  # Default contract address
            'purchaser': self.wallet_address,
            'purchase_date': int(self.purchase_date.timestamp()),
            'is_used': self.is_used,
            'is_active': self.is_active,
            'seat_info': self.seat_info,
            'ticket_type': self.ticket_type
        }

    def __repr__(self):
        return f'<Ticket {self.token_id} for Event {self.event_id}>'