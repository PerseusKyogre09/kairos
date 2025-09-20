import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    # Database configuration - Supabase by default, SQLite as fallback
    DATABASE_URL = os.getenv('DATABASE_URL')
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

    if DATABASE_URL:
        # Use direct DATABASE_URL (works with Supabase, Heroku, etc.)
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    elif SUPABASE_URL:
        # Construct PostgreSQL URI from Supabase credentials
        # Note: You'll need to get the direct PostgreSQL connection string from Supabase dashboard
        # This is for reference - you'll set DATABASE_URL directly
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    else:
        # SQLite fallback for local development
        SQLALCHEMY_DATABASE_URI = 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 15))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', 30))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://192.168.137.224:3000').split(',')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    FLASK_ENV = 'development'
    # Allow all origins for development (including ngrok)
    CORS_ORIGINS = ['*']

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    FLASK_ENV = 'production'
    
    # In production, ensure these are set via environment variables
    SECRET_KEY = os.environ.get('SECRET_KEY') or Config.SECRET_KEY
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or Config.JWT_SECRET_KEY
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or Config.SQLALCHEMY_DATABASE_URI
    
    # Production CORS settings
    frontend_url = os.environ.get('FRONTEND_URL', 'https://blockevent.vercel.app')
    CORS_ORIGINS = [frontend_url, 'https://*.vercel.app']
    
    @classmethod
    def validate_config(cls):
        """Validate that required environment variables are set"""
        required_vars = ['DATABASE_URL', 'JWT_SECRET_KEY']
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}