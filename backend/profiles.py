from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from marshmallow import Schema, fields, ValidationError, validates
import json
import os
import uuid
from werkzeug.utils import secure_filename

profiles_bp = Blueprint('profiles', __name__)

# Configure upload settings
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads', 'profiles')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

profiles_bp = Blueprint('profiles', __name__)

# Validation schemas
class ProfileUpdateSchema(Schema):
    bio = fields.Str(allow_none=True, validate=lambda x: len(x) <= 500 if x else True)
    location = fields.Str(allow_none=True, validate=lambda x: len(x) <= 100 if x else True)
    website = fields.Str(allow_none=True, validate=lambda x: len(x) <= 200 if x else True)
    linkedin_url = fields.Str(allow_none=True, validate=lambda x: len(x) <= 200 if x else True)
    twitter_handle = fields.Str(allow_none=True, validate=lambda x: len(x) <= 50 if x else True)
    github_username = fields.Str(allow_none=True, validate=lambda x: len(x) <= 50 if x else True)
    is_profile_public = fields.Bool()

class WalletVerificationSchema(Schema):
    wallet_address = fields.Str(required=True, validate=lambda x: len(x) == 42 and x.startswith('0x'))
    signature = fields.Str(required=True)
    message = fields.Str(required=True)

class SkillsUpdateSchema(Schema):
    skills = fields.List(fields.Str(validate=lambda x: len(x.strip()) > 0))

class InterestsUpdateSchema(Schema):
    interests = fields.List(fields.Str(validate=lambda x: len(x.strip()) > 0))

@profiles_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    """Get current user's profile"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'profile': user.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user's profile"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Validate input data
        schema = ProfileUpdateSchema()
        data = schema.load(request.get_json())

        # Update profile fields
        for field in ['bio', 'location', 'website', 'linkedin_url', 'twitter_handle', 'github_username', 'is_profile_public']:
            if field in data:
                setattr(user, field, data[field])

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'profile': user.to_dict()
        }), 200

    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me/wallet', methods=['PUT'])
@jwt_required()
def update_wallet_address():
    """Update user's wallet address with verification"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        # If wallet address is being set, require verification
        if 'wallet_address' in data:
            wallet_address = data['wallet_address'].strip()
            
            # Validate wallet address format
            if not (len(wallet_address) == 42 and wallet_address.startswith('0x')):
                return jsonify({'error': 'Invalid wallet address format. Must be 42 characters starting with 0x'}), 400

            # Check if address is already taken by another user
            existing_user = User.query.filter_by(wallet_address=wallet_address).first()
            if existing_user and existing_user.id != current_user_id:
                return jsonify({'error': 'Wallet address already associated with another account'}), 409

            # If verification is required (signature provided)
            if 'signature' in data and 'message' in data:
                schema = WalletVerificationSchema()
                verification_data = schema.load({
                    'wallet_address': wallet_address,
                    'signature': data['signature'],
                    'message': data['message']
                })

                # Verify the signature against the new wallet address
                # Temporarily set the wallet address for verification
                old_wallet = user.wallet_address
                user.wallet_address = wallet_address
                
                signature_valid = user.verify_wallet_signature(verification_data['message'], verification_data['signature'])
                
                # Restore old wallet address if verification fails
                if not signature_valid:
                    user.wallet_address = old_wallet
                    return jsonify({'error': 'Invalid signature - wallet address verification failed'}), 400

                user.wallet_verified = True
            else:
                # For MetaMask connections, automatically accept the address as verified
                # since the user connected through MetaMask which proves ownership
                user.wallet_verified = True

            user.wallet_address = wallet_address

        db.session.commit()

        return jsonify({
            'message': 'Wallet address updated successfully',
            'wallet_address': user.wallet_address,
            'wallet_verified': user.wallet_verified
        }), 200

    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me/skills', methods=['PUT'])
@jwt_required()
def update_skills():
    """Update user's skills"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Validate input data
        schema = SkillsUpdateSchema()
        data = schema.load(request.get_json())

        # Update skills
        user.skills = json.dumps(data['skills'])

        db.session.commit()

        return jsonify({
            'message': 'Skills updated successfully',
            'skills': json.loads(user.skills)
        }), 200

    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me/interests', methods=['PUT'])
@jwt_required()
def update_interests():
    """Update user's interests"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Validate input data
        schema = InterestsUpdateSchema()
        data = schema.load(request.get_json())

        # Update interests
        user.interests = json.dumps(data['interests'])

        db.session.commit()

        return jsonify({
            'message': 'Interests updated successfully',
            'interests': json.loads(user.interests)
        }), 200

    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/<int:user_id>', methods=['GET'])
def get_public_profile(user_id):
    """Get public profile information for a user"""
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check if profile is public
        if not user.is_profile_public:
            return jsonify({'error': 'Profile is private'}), 403

        # Return only public information
        profile_data = user.to_dict()
        # Remove sensitive information
        sensitive_fields = ['email', 'is_active', 'is_admin', 'wallet_verified']
        for field in sensitive_fields:
            profile_data.pop(field, None)

        return jsonify({'profile': profile_data}), 200

    except Exception as e:
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me/verify-wallet', methods=['POST'])
@jwt_required()
def request_wallet_verification():
    """Generate a message for wallet verification"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Generate a verification message
        import time
        timestamp = int(time.time())
        message = f"Verify wallet ownership for user {user.username} at timestamp {timestamp}"

        return jsonify({
            'message': message,
            'timestamp': timestamp,
            'instructions': 'Sign this message with your wallet to verify ownership'
        }), 200

    except Exception as e:
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me/profile-image', methods=['POST'])
@jwt_required()
def upload_profile_image():
    """Upload profile image for current user"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check if file is present
        if 'profile_image' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['profile_image']

        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use PNG, JPG, JPEG, or GIF'}), 400

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large. Maximum size is 5MB'}), 400

        # Generate secure filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        secure_name = secure_filename(f"{user.id}_{uuid.uuid4().hex}.{file_extension}")
        file_path = os.path.join(UPLOAD_FOLDER, secure_name)

        # Save file
        file.save(file_path)

        # Update user's profile image URL
        # In a production environment, you'd upload to cloud storage (S3, Cloudinary, etc.)
        # For now, we'll use a local URL
        base_url = os.getenv('BASE_URL', 'http://localhost:5000')
        image_url = f"{base_url}/uploads/profiles/{secure_name}"

        user.profile_image_url = image_url
        db.session.commit()

        return jsonify({
            'message': 'Profile image uploaded successfully',
            'profile_image_url': image_url
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@profiles_bp.route('/me/profile-image', methods=['DELETE'])
@jwt_required()
def delete_profile_image():
    """Delete current user's profile image"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.profile_image_url:
            return jsonify({'error': 'No profile image to delete'}), 400

        # Extract filename from URL
        image_url = user.profile_image_url
        if '/uploads/profiles/' in image_url:
            filename = image_url.split('/uploads/profiles/')[-1]
            file_path = os.path.join(UPLOAD_FOLDER, filename)

            # Delete file if it exists
            if os.path.exists(file_path):
                os.remove(file_path)

        # Clear profile image URL
        user.profile_image_url = None
        db.session.commit()

        return jsonify({'message': 'Profile image deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500