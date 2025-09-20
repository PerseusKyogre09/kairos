from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)

# Rate limiting for auth endpoints
limiter = Limiter(key_func=get_remote_address)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()

        # Validate input
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters long'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        if '@' not in email:
            return jsonify({'error': 'Invalid email format'}), 400

        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 409
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409

        # Create new user
        user = User(
            username=username,
            email=email,
            password=password,
            first_name=first_name or None,
            last_name=last_name or None
        )

        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """User login endpoint"""
    try:
        data = request.get_json()

        # Validate required fields
        if 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password are required'}), 400

        username = data['username'].strip()
        password = data['password']

        # Find user
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401

        # Create tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token endpoint"""
    try:
        current_user_id = get_jwt_identity()
        access_token = create_access_token(identity=str(current_user_id))

        return jsonify({
            'access_token': access_token
        }), 200

    except Exception as e:
        return jsonify({'error': 'Token refresh failed', 'details': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    """Get current user profile"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get profile', 'details': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout endpoint (client should discard tokens)"""
    return jsonify({'message': 'Logout successful'}), 200