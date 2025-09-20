from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Event, User
from datetime import datetime
from marshmallow import Schema, fields, ValidationError, validates, validates_schema
import math

events_bp = Blueprint('events', __name__)

# Validation schemas
class EventCreateSchema(Schema):
    title = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    description = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    start_date = fields.DateTime(required=True)
    end_date = fields.DateTime(allow_none=True)
    ticket_price = fields.Float(required=True, validate=lambda x: x >= 0)
    capacity = fields.Int(required=True, validate=lambda x: x > 0)
    location = fields.Str(allow_none=True)

    @validates('end_date')
    def validate_end_date(self, value):
        if value and value <= datetime.utcnow():
            raise ValidationError('End date must be in the future')

    @validates_schema
    def validate_dates(self, data, **kwargs):
        if 'end_date' in data and data['end_date'] and data['start_date'] >= data['end_date']:
            raise ValidationError('Start date must be before end date')

class EventUpdateSchema(Schema):
    title = fields.Str(validate=lambda x: len(x.strip()) > 0)
    description = fields.Str(validate=lambda x: len(x.strip()) > 0)
    start_date = fields.DateTime()
    end_date = fields.DateTime(allow_none=True)
    ticket_price = fields.Float(validate=lambda x: x >= 0)
    capacity = fields.Int(validate=lambda x: x > 0)
    location = fields.Str(allow_none=True)
    is_active = fields.Bool()

    @validates('end_date')
    def validate_end_date(self, value):
        if value and value <= datetime.utcnow():
            raise ValidationError('End date must be in the future')

    @validates_schema
    def validate_dates(self, data, **kwargs):
        if 'end_date' in data and 'start_date' in data and data['start_date'] and data['end_date'] and data['start_date'] >= data['end_date']:
            raise ValidationError('Start date must be before end date')

# Helper function to get paginated events
def get_paginated_events(page=1, per_page=10, organizer_id=None, active_only=True):
    query = Event.query

    if organizer_id:
        query = query.filter_by(organizer_id=organizer_id)

    if active_only:
        query = query.filter_by(is_active=True)

    # Order by start date (upcoming first)
    query = query.order_by(Event.start_date.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return {
        'events': [event.to_dict() for event in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    }

@events_bp.route('/', methods=['POST'])
@jwt_required()
def create_event():
    """Create a new event"""
    try:
        # Get current user
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Validate input data
        schema = EventCreateSchema()
        data = schema.load(request.get_json())

        # Create event
        event = Event(
            title=data['title'].strip(),
            description=data['description'].strip(),
            start_date=data['start_date'],
            end_date=data.get('end_date'),
            ticket_price=data['ticket_price'],
            capacity=data['capacity'],
            location=data.get('location'),
            organizer_id=current_user_id
        )

        db.session.add(event)
        db.session.commit()

        return jsonify({
            'message': 'Event created successfully',
            'event': event.to_dict()
        }), 201

    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@events_bp.route('/', methods=['GET'])
def get_events():
    """Get list of events with pagination"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        organizer_id = request.args.get('organizer_id', type=int)
        active_only = request.args.get('active_only', 'true').lower() == 'true'

        # Validate pagination parameters
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 10

        result = get_paginated_events(page, per_page, organizer_id, active_only)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@events_bp.route('/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """Get a single event by ID"""
    try:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        return jsonify({'event': event.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@events_bp.route('/<int:event_id>', methods=['PUT'])
@jwt_required()
def update_event(event_id):
    """Update an existing event"""
    try:
        # Get current user
        current_user_id = int(get_jwt_identity())

        # Get event
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Check if user is the organizer
        if event.organizer_id != current_user_id:
            return jsonify({'error': 'Unauthorized: Only the organizer can update this event'}), 403

        # Validate input data
        schema = EventUpdateSchema()
        data = schema.load(request.get_json())

        # Update event fields
        for field in ['title', 'description', 'start_date', 'end_date', 'ticket_price', 'capacity', 'location', 'is_active']:
            if field in data:
                if field in ['title', 'description', 'location'] and data[field] is not None:
                    setattr(event, field, data[field].strip())
                else:
                    setattr(event, field, data[field])

        db.session.commit()

        return jsonify({
            'message': 'Event updated successfully',
            'event': event.to_dict()
        }), 200

    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@events_bp.route('/<int:event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    """Delete an event"""
    try:
        # Get current user
        current_user_id = int(get_jwt_identity())

        # Get event
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Check if user is the organizer
        if event.organizer_id != current_user_id:
            return jsonify({'error': 'Unauthorized: Only the organizer can delete this event'}), 403

        # Soft delete by setting is_active to False
        event.is_active = False
        db.session.commit()

        return jsonify({'message': 'Event deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500