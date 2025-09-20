#!/bin/bash

# Startup script for Render deployment
echo "Starting BlockEvent Backend..."

# Set Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Run database migrations if needed
echo "Checking database connection..."

# Start the application with gunicorn
echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --access-logfile - --error-logfile - backend.app:app