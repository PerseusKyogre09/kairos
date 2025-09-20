from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from config import config
from models import db
from auth import auth_bp
from events import events_bp
from blockchain_api import blockchain_bp
# from agentkit_api import agentkit_bp  # Temporarily disabled due to compatibility issue
from profiles import profiles_bp
from blockchain import blockchain_service

# Initialize Flask app
app = Flask(__name__)

# Load configuration
config_name = os.getenv('FLASK_ENV', 'development')
app.config.from_object(config[config_name])

# CORS Configuration
CORS(app, origins=app.config['CORS_ORIGINS'])

# Initialize extensions
jwt = JWTManager(app)
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Security headers
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(events_bp, url_prefix='/events')
app.register_blueprint(blockchain_bp, url_prefix='/blockchain')
app.register_blueprint(profiles_bp, url_prefix='/profiles')
# app.register_blueprint(agentkit_bp, url_prefix='/api/agent')  # Temporarily disabled

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    from flask import send_from_directory
    upload_folder = os.path.join(os.path.dirname(__file__), 'uploads')
    return send_from_directory(upload_folder, filename)

# Basic route for testing
@app.route('/')
def hello():
    return {'message': 'Flask backend is running!'}

@app.route('/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)