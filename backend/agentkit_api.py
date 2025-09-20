"""
API endpoints for AgentKit integration
Provides AI-powered assistance through REST API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from agentkit_service import blockchain_agent
import logging
import asyncio

logger = logging.getLogger(__name__)

agentkit_bp = Blueprint('agentkit', __name__)

def run_async(coro):
    """Helper function to run async functions in Flask"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)

@agentkit_bp.route('/status', methods=['GET'])
def get_agent_status():
    """Get AgentKit status and capabilities"""
    try:
        status = blockchain_agent.get_agent_status()
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Agent status error: {str(e)}")
        return jsonify({'error': 'Failed to get agent status'}), 500

@agentkit_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat_with_agent():
    """General chat interface with the AI agent"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        user_context = data.get('context', {})
        user_context['user_id'] = current_user_id
        
        # Run async function
        response = run_async(blockchain_agent.chat_with_user(user_message, user_context))
        
        return jsonify({
            'response': response,
            'timestamp': blockchain_agent.get_agent_status()['initialized_at']
        }), 200
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': 'Failed to process chat message'}), 500

@agentkit_bp.route('/recommendations', methods=['GET'])
@jwt_required()
def get_event_recommendations():
    """Get personalized event recommendations"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get optional preferences from query parameters
        preferences = {}
        if request.args.get('location'):
            preferences['location'] = request.args.get('location')
        if request.args.get('price_range'):
            preferences['price_range'] = request.args.get('price_range')
        if request.args.get('event_type'):
            preferences['event_type'] = request.args.get('event_type')
        
        # Run async function
        recommendations = run_async(
            blockchain_agent.get_event_recommendations(current_user_id, preferences)
        )
        
        return jsonify({
            'recommendations': recommendations,
            'user_id': current_user_id
        }), 200
        
    except Exception as e:
        logger.error(f"Recommendations error: {str(e)}")
        return jsonify({'error': 'Failed to get recommendations'}), 500

@agentkit_bp.route('/event-creation-help', methods=['POST'])
@jwt_required()
def assist_event_creation():
    """Get AI assistance for event creation"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if 'user_input' not in data:
            return jsonify({'error': 'User input is required'}), 400
        
        user_input = data['user_input']
        user_context = data.get('context', {})
        user_context['user_id'] = current_user_id
        
        # Run async function
        assistance = run_async(
            blockchain_agent.assist_event_creation(user_input, user_context)
        )
        
        return jsonify(assistance), 200
        
    except Exception as e:
        logger.error(f"Event creation assistance error: {str(e)}")
        return jsonify({'error': 'Failed to provide event creation assistance'}), 500

@agentkit_bp.route('/troubleshoot', methods=['POST'])
@jwt_required()
def troubleshoot_issue():
    """Get AI help for troubleshooting blockchain issues"""
    try:
        data = request.get_json()
        
        if 'issue_description' not in data:
            return jsonify({'error': 'Issue description is required'}), 400
        
        issue_description = data['issue_description']
        error_details = data.get('error_details', {})
        
        # Run async function
        troubleshooting = run_async(
            blockchain_agent.troubleshoot_blockchain_issue(issue_description, error_details)
        )
        
        return jsonify(troubleshooting), 200
        
    except Exception as e:
        logger.error(f"Troubleshooting error: {str(e)}")
        return jsonify({'error': 'Failed to provide troubleshooting assistance'}), 500

@agentkit_bp.route('/profile-optimization', methods=['GET'])
@jwt_required()
def optimize_profile():
    """Get AI suggestions for profile optimization"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Run async function
        optimization = run_async(
            blockchain_agent.optimize_user_profile(current_user_id)
        )
        
        return jsonify(optimization), 200
        
    except Exception as e:
        logger.error(f"Profile optimization error: {str(e)}")
        return jsonify({'error': 'Failed to provide profile optimization'}), 500

@agentkit_bp.route('/generate-description', methods=['POST'])
@jwt_required()
def generate_event_description():
    """Generate AI-powered event description"""
    try:
        data = request.get_json()
        
        if 'event_title' not in data:
            return jsonify({'error': 'Event title is required'}), 400
        
        event_title = data['event_title']
        event_details = data.get('event_details', {})
        
        # Run async function
        description = run_async(
            blockchain_agent.generate_event_description(event_title, event_details)
        )
        
        return jsonify({
            'generated_description': description,
            'event_title': event_title
        }), 200
        
    except Exception as e:
        logger.error(f"Description generation error: {str(e)}")
        return jsonify({'error': 'Failed to generate event description'}), 500

@agentkit_bp.route('/smart-suggestions', methods=['POST'])
@jwt_required()
def get_smart_suggestions():
    """Get context-aware smart suggestions"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        suggestion_type = data.get('type', 'general')  # general, event_creation, profile, troubleshooting
        context = data.get('context', {})
        context['user_id'] = current_user_id
        
        if suggestion_type == 'event_creation':
            user_input = data.get('user_input', '')
            result = run_async(blockchain_agent.assist_event_creation(user_input, context))
        elif suggestion_type == 'profile':
            result = run_async(blockchain_agent.optimize_user_profile(current_user_id))
        elif suggestion_type == 'recommendations':
            preferences = data.get('preferences', {})
            recommendations = run_async(blockchain_agent.get_event_recommendations(current_user_id, preferences))
            result = {'success': True, 'recommendations': recommendations}
        else:
            # General suggestions
            message = data.get('message', 'Give me some general suggestions for using this platform effectively')
            response = run_async(blockchain_agent.chat_with_user(message, context))
            result = {'success': True, 'suggestions': response}
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Smart suggestions error: {str(e)}")
        return jsonify({'error': 'Failed to provide smart suggestions'}), 500