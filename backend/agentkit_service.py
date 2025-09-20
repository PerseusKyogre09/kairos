"""
AI Agent integration for blockchain event management platform
Provides AI-powered assistance for event management, user queries, and blockchain operations
"""

import os
from agentkit.agents.simple_agent import SimpleAgent
from typing import Dict, Any, List, Optional
import json
import logging
from datetime import datetime, timedelta
from models import db, User, Event

logger = logging.getLogger(__name__)

class BlockchainEventAgent:
    """AI Agent for blockchain event management assistance"""
    
    def __init__(self):
        # Agent configuration
        self.agent_id = "c78b3489-9887-4dfb-a991-377a8df2aa3b"
        self.agent_secret = "R5OVIUpM3FnhQfOeX8C33C+P1ZuRStakhTatgKCnkSf7Bhk0fb4w93grVSHejAkr1klJ8b51lvhH1S2fQxXlvg=="
        
        # Initialize OpenAI client (using a free model for now)
        # In production, you would use your AgentKit credentials to get an API key
        self.client = None
        self.model = "gpt-3.5-turbo"  # You can change this based on your needs
        
        # Try to initialize with OpenAI API key if available
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            try:
                self.client = openai.OpenAI(api_key=api_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {str(e)}")
                self.client = None
        else:
            logger.warning("No OpenAI API key found. AI features will use mock responses.")
        
        # Define agent capabilities
        self.capabilities = [
            "event_creation_assistance",
            "event_discovery",
            "ticket_purchase_guidance", 
            "blockchain_transaction_help",
            "user_profile_optimization",
            "event_recommendations",
            "troubleshooting_support"
        ]
        
        if self.agent:
            logger.info("BlockchainEventAgent initialized successfully")
        else:
            logger.warning("BlockchainEventAgent initialization failed")

    def is_available(self) -> bool:
        """Check if the agent is available for use"""
        return self.agent is not None

    async def get_event_recommendations(self, user_id: int, preferences: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get personalized event recommendations for a user"""
        if not self.is_available():
            return []
        
        try:
            user = User.query.get(user_id)
            if not user:
                return []

            # Get user's interests and skills
            user_interests = json.loads(user.interests) if user.interests else []
            user_skills = json.loads(user.skills) if user.skills else []
            
            # Get upcoming events
            upcoming_events = Event.query.filter(
                Event.start_date > datetime.utcnow(),
                Event.is_active == True
            ).limit(10).all()

            # Prepare context for AI recommendation
            context = {
                "user_profile": {
                    "interests": user_interests,
                    "skills": user_skills,
                    "location": user.location,
                    "bio": user.bio
                },
                "available_events": [
                    {
                        "id": event.id,
                        "title": event.title,
                        "description": event.description,
                        "start_date": event.start_date.isoformat(),
                        "location": event.location,
                        "ticket_price": event.ticket_price,
                        "capacity": event.capacity
                    }
                    for event in upcoming_events
                ],
                "preferences": preferences or {}
            }

            # Get AI recommendations
            prompt = f"""
            Based on the user profile and available events, recommend the top 3 most relevant events.
            Consider the user's interests, skills, location, and preferences.
            
            User Profile: {json.dumps(context['user_profile'], indent=2)}
            Available Events: {json.dumps(context['available_events'], indent=2)}
            
            Return a JSON array of recommended event IDs with reasons for recommendation.
            Format: [{{"event_id": 1, "reason": "This event matches your interest in blockchain technology", "relevance_score": 0.9}}]
            """

            response = await self.agent.chat(prompt)
            
            # Parse AI response and return recommendations
            try:
                recommendations = json.loads(response)
                return recommendations
            except json.JSONDecodeError:
                logger.error("Failed to parse AI recommendations response")
                return []

        except Exception as e:
            logger.error(f"Error getting event recommendations: {str(e)}")
            return []

    async def assist_event_creation(self, user_input: str, user_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Help users create better events with AI assistance"""
        try:
            prompt = f"""
            You are an expert event organizer assistant. Help the user create a compelling blockchain/tech event.
            
            User Input: {user_input}
            User Context: {json.dumps(user_context or {}, indent=2)}
            
            Provide suggestions for:
            1. Event title optimization
            2. Description improvements
            3. Pricing recommendations
            4. Target audience identification
            5. Marketing tips
            
            Return a JSON response with structured suggestions.
            """

            response = await self.agent.chat(prompt)
            
            try:
                suggestions = json.loads(response)
                return {
                    "success": True,
                    "suggestions": suggestions
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "suggestions": {
                        "general_advice": response
                    }
                }

        except Exception as e:
            logger.error(f"Error in event creation assistance: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def troubleshoot_blockchain_issue(self, issue_description: str, error_details: Dict[str, Any] = None) -> Dict[str, Any]:
        """Help users troubleshoot blockchain and MetaMask issues"""
        try:
            prompt = f"""
            You are a blockchain technical support expert. Help the user resolve their issue.
            
            Issue Description: {issue_description}
            Error Details: {json.dumps(error_details or {}, indent=2)}
            
            Provide step-by-step troubleshooting guidance for common blockchain/MetaMask issues:
            - Connection problems
            - Transaction failures
            - Gas fee issues
            - Network configuration
            - Wallet verification problems
            
            Return practical, easy-to-follow solutions.
            """

            response = await self.agent.chat(prompt)
            
            return {
                "success": True,
                "troubleshooting_guide": response,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in blockchain troubleshooting: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def optimize_user_profile(self, user_id: int) -> Dict[str, Any]:
        """Provide AI-powered suggestions to improve user profiles"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {"success": False, "error": "User not found"}

            user_data = user.to_dict()
            
            prompt = f"""
            Analyze this user profile and provide optimization suggestions:
            
            Profile Data: {json.dumps(user_data, indent=2)}
            
            Suggest improvements for:
            1. Bio optimization
            2. Skills enhancement
            3. Interest refinement
            4. Profile completeness
            5. Networking opportunities
            
            Focus on helping them get more value from blockchain events.
            Return actionable suggestions in JSON format.
            """

            response = await self.agent.chat(prompt)
            
            try:
                suggestions = json.loads(response)
                return {
                    "success": True,
                    "optimization_suggestions": suggestions
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "optimization_suggestions": {
                        "general_advice": response
                    }
                }

        except Exception as e:
            logger.error(f"Error in profile optimization: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def generate_event_description(self, event_title: str, event_details: Dict[str, Any]) -> str:
        """Generate compelling event descriptions using AI"""
        try:
            prompt = f"""
            Create an engaging event description for a blockchain/tech event.
            
            Event Title: {event_title}
            Event Details: {json.dumps(event_details, indent=2)}
            
            Generate a compelling description that:
            1. Captures attention
            2. Clearly explains the value proposition
            3. Includes relevant keywords
            4. Encourages registration
            5. Maintains professional tone
            
            Keep it concise but informative (200-300 words).
            """

            response = await self.agent.chat(prompt)
            return response.strip()

        except Exception as e:
            logger.error(f"Error generating event description: {str(e)}")
            return "Unable to generate description at this time."

    async def chat_with_user(self, user_message: str, user_context: Dict[str, Any] = None) -> str:
        """General chat interface for user assistance"""
        try:
            context_info = ""
            if user_context:
                context_info = f"User Context: {json.dumps(user_context, indent=2)}\n"

            prompt = f"""
            You are a helpful assistant for a blockchain event management platform called BlockEvent.
            
            {context_info}
            User Message: {user_message}
            
            Provide helpful, friendly assistance related to:
            - Event discovery and recommendations
            - Blockchain/MetaMask help
            - Platform navigation
            - Event creation tips
            - General questions about blockchain events
            
            Keep responses conversational and helpful.
            """

            response = await self.agent.chat(prompt)
            return response

        except Exception as e:
            logger.error(f"Error in user chat: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later."

    def get_agent_status(self) -> Dict[str, Any]:
        """Get current agent status and capabilities"""
        return {
            "agent_id": self.agent_id,
            "status": "active" if self.is_available() else "unavailable",
            "available": self.is_available(),
            "capabilities": self.capabilities,
            "initialized_at": datetime.utcnow().isoformat()
        }

# Global agent instance
blockchain_agent = BlockchainEventAgent()