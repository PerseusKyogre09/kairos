// AgentKit AI Assistant integration
class AgentKitManager {
    constructor() {
        this.isAvailable = false;
        this.chatHistory = [];
        this.currentContext = {};
        this.checkAgentStatus();
    }

    // Check if AgentKit is available
    async checkAgentStatus() {
        try {
            const result = await api.get(CONFIG.ENDPOINTS.AGENT.STATUS);
            if (result.success) {
                this.isAvailable = true;
                console.log('AgentKit is available:', result.data);
                eventBus.emit('agent:available', result.data);
            }
        } catch (error) {
            console.warn('AgentKit not available:', error);
            this.isAvailable = false;
        }
    }

    // Chat with the AI agent
    async chat(message, context = {}) {
        try {
            if (!auth.isAuthenticated()) {
                throw new Error('Please login to use AI assistance');
            }

            const result = await api.authPost(CONFIG.ENDPOINTS.AGENT.CHAT, {
                message: message,
                context: { ...this.currentContext, ...context }
            });

            if (result.success) {
                // Add to chat history
                this.chatHistory.push({
                    user: message,
                    agent: result.data.response,
                    timestamp: new Date().toISOString()
                });

                return result.data.response;
            } else {
                throw new Error(result.error || 'Failed to get AI response');
            }
        } catch (error) {
            console.error('Agent chat error:', error);
            throw error;
        }
    }

    // Get personalized event recommendations
    async getEventRecommendations(preferences = {}) {
        try {
            if (!auth.isAuthenticated()) {
                throw new Error('Please login to get recommendations');
            }

            const params = new URLSearchParams(preferences);
            const result = await api.authGet(`${CONFIG.ENDPOINTS.AGENT.RECOMMENDATIONS}?${params}`);

            if (result.success) {
                return result.data.recommendations;
            } else {
                throw new Error(result.error || 'Failed to get recommendations');
            }
        } catch (error) {
            console.error('Recommendations error:', error);
            throw error;
        }
    }

    // Get help with event creation
    async getEventCreationHelp(userInput, context = {}) {
        try {
            if (!auth.isAuthenticated()) {
                throw new Error('Please login to use AI assistance');
            }

            const result = await api.authPost(CONFIG.ENDPOINTS.AGENT.EVENT_HELP, {
                user_input: userInput,
                context: context
            });

            if (result.success) {
                return result.data.suggestions;
            } else {
                throw new Error(result.error || 'Failed to get event creation help');
            }
        } catch (error) {
            console.error('Event creation help error:', error);
            throw error;
        }
    }

    // Get troubleshooting help
    async getTroubleshootingHelp(issueDescription, errorDetails = {}) {
        try {
            const result = await api.authPost(CONFIG.ENDPOINTS.AGENT.TROUBLESHOOT, {
                issue_description: issueDescription,
                error_details: errorDetails
            });

            if (result.success) {
                return result.data.troubleshooting_guide;
            } else {
                throw new Error(result.error || 'Failed to get troubleshooting help');
            }
        } catch (error) {
            console.error('Troubleshooting help error:', error);
            throw error;
        }
    }

    // Get profile optimization suggestions
    async getProfileOptimization() {
        try {
            if (!auth.isAuthenticated()) {
                throw new Error('Please login to get profile optimization');
            }

            const result = await api.authGet(CONFIG.ENDPOINTS.AGENT.PROFILE_OPTIMIZATION);

            if (result.success) {
                return result.data.optimization_suggestions;
            } else {
                throw new Error(result.error || 'Failed to get profile optimization');
            }
        } catch (error) {
            console.error('Profile optimization error:', error);
            throw error;
        }
    }

    // Generate event description
    async generateEventDescription(eventTitle, eventDetails = {}) {
        try {
            if (!auth.isAuthenticated()) {
                throw new Error('Please login to use AI assistance');
            }

            const result = await api.authPost(CONFIG.ENDPOINTS.AGENT.GENERATE_DESCRIPTION, {
                event_title: eventTitle,
                event_details: eventDetails
            });

            if (result.success) {
                return result.data.generated_description;
            } else {
                throw new Error(result.error || 'Failed to generate description');
            }
        } catch (error) {
            console.error('Description generation error:', error);
            throw error;
        }
    }

    // Get smart suggestions based on context
    async getSmartSuggestions(type = 'general', context = {}) {
        try {
            if (!auth.isAuthenticated()) {
                throw new Error('Please login to get suggestions');
            }

            const result = await api.authPost(CONFIG.ENDPOINTS.AGENT.SMART_SUGGESTIONS, {
                type: type,
                context: context
            });

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to get suggestions');
            }
        } catch (error) {
            console.error('Smart suggestions error:', error);
            throw error;
        }
    }

    // Update current context for better AI responses
    updateContext(newContext) {
        this.currentContext = { ...this.currentContext, ...newContext };
    }

    // Clear chat history
    clearChatHistory() {
        this.chatHistory = [];
    }

    // Get chat history
    getChatHistory() {
        return this.chatHistory;
    }
}

// AI Assistant UI Manager
class AIAssistantUI {
    constructor() {
        this.isOpen = false;
        this.currentMode = 'chat'; // chat, recommendations, help
        this.initializeUI();
    }

    initializeUI() {
        // Create AI assistant button
        this.createAssistantButton();
        // Create AI assistant modal
        this.createAssistantModal();
    }

    createAssistantButton() {
        const button = document.createElement('button');
        button.id = 'ai-assistant-btn';
        button.className = 'fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50';
        button.innerHTML = '<i class="fas fa-robot text-xl"></i>';
        button.title = 'AI Assistant';
        button.onclick = () => this.toggleAssistant();
        
        document.body.appendChild(button);
    }

    createAssistantModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-assistant-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden';
        
        modal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-6 border-b">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-robot text-white"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">AI Assistant</h3>
                                <p class="text-sm text-gray-500">Powered by AgentKit</p>
                            </div>
                        </div>
                        <button onclick="aiAssistantUI.closeAssistant()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <!-- Mode Tabs -->
                    <div class="flex border-b">
                        <button onclick="aiAssistantUI.setMode('chat')" 
                                class="flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors"
                                id="chat-tab">
                            <i class="fas fa-comments mr-2"></i>Chat
                        </button>
                        <button onclick="aiAssistantUI.setMode('recommendations')" 
                                class="flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors"
                                id="recommendations-tab">
                            <i class="fas fa-lightbulb mr-2"></i>Recommendations
                        </button>
                        <button onclick="aiAssistantUI.setMode('help')" 
                                class="flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors"
                                id="help-tab">
                            <i class="fas fa-question-circle mr-2"></i>Help
                        </button>
                    </div>

                    <!-- Content Area -->
                    <div class="flex-1 overflow-hidden">
                        <!-- Chat Mode -->
                        <div id="chat-mode" class="h-full flex flex-col">
                            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
                                <div class="text-center text-gray-500 text-sm">
                                    <i class="fas fa-robot text-2xl mb-2"></i>
                                    <p>Hi! I'm your AI assistant. How can I help you today?</p>
                                </div>
                            </div>
                            <div class="p-4 border-t">
                                <div class="flex space-x-2">
                                    <input type="text" id="chat-input" 
                                           placeholder="Ask me anything about events, blockchain, or the platform..."
                                           class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                                    <button onclick="aiAssistantUI.sendMessage()" 
                                            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Recommendations Mode -->
                        <div id="recommendations-mode" class="h-full p-4 hidden">
                            <div class="space-y-4">
                                <h4 class="font-medium text-gray-900">Get Personalized Event Recommendations</h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                        <input type="text" id="rec-location" placeholder="e.g., Virtual, New York" 
                                               class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                                        <select id="rec-price" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                            <option value="">Any Price</option>
                                            <option value="free">Free</option>
                                            <option value="low">Under 0.1 ETH</option>
                                            <option value="medium">0.1 - 0.5 ETH</option>
                                            <option value="high">Over 0.5 ETH</option>
                                        </select>
                                    </div>
                                </div>
                                <button onclick="aiAssistantUI.getRecommendations()" 
                                        class="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
                                    Get Recommendations
                                </button>
                                <div id="recommendations-results" class="space-y-3"></div>
                            </div>
                        </div>

                        <!-- Help Mode -->
                        <div id="help-mode" class="h-full p-4 hidden">
                            <div class="space-y-4">
                                <h4 class="font-medium text-gray-900">Quick Help Topics</h4>
                                <div class="grid grid-cols-1 gap-3">
                                    <button onclick="aiAssistantUI.quickHelp('metamask')" 
                                            class="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <i class="fas fa-wallet text-purple-600 mr-2"></i>
                                        MetaMask Connection Issues
                                    </button>
                                    <button onclick="aiAssistantUI.quickHelp('transaction')" 
                                            class="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <i class="fas fa-exchange-alt text-purple-600 mr-2"></i>
                                        Transaction Problems
                                    </button>
                                    <button onclick="aiAssistantUI.quickHelp('event-creation')" 
                                            class="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <i class="fas fa-calendar-plus text-purple-600 mr-2"></i>
                                        Creating Better Events
                                    </button>
                                    <button onclick="aiAssistantUI.quickHelp('profile')" 
                                            class="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <i class="fas fa-user text-purple-600 mr-2"></i>
                                        Profile Optimization
                                    </button>
                                </div>
                                <div id="help-results" class="mt-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add enter key listener for chat
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    toggleAssistant() {
        if (this.isOpen) {
            this.closeAssistant();
        } else {
            this.openAssistant();
        }
    }

    openAssistant() {
        if (!agentKit.isAvailable) {
            showNotification('AI Assistant is not available at the moment', 'error');
            return;
        }

        document.getElementById('ai-assistant-modal').classList.remove('hidden');
        this.isOpen = true;
        this.setMode('chat');
    }

    closeAssistant() {
        document.getElementById('ai-assistant-modal').classList.add('hidden');
        this.isOpen = false;
    }

    setMode(mode) {
        this.currentMode = mode;
        
        // Hide all modes
        document.getElementById('chat-mode').classList.add('hidden');
        document.getElementById('recommendations-mode').classList.add('hidden');
        document.getElementById('help-mode').classList.add('hidden');
        
        // Show selected mode
        document.getElementById(`${mode}-mode`).classList.remove('hidden');
        
        // Update tab styles
        document.querySelectorAll('[id$="-tab"]').forEach(tab => {
            tab.classList.remove('border-purple-500', 'text-purple-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });
        
        document.getElementById(`${mode}-tab`).classList.remove('border-transparent', 'text-gray-500');
        document.getElementById(`${mode}-tab`).classList.add('border-purple-500', 'text-purple-600');
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        
        // Add user message to chat
        this.addMessageToChat('user', message);
        
        try {
            // Show typing indicator
            this.addMessageToChat('agent', 'Thinking...', true);
            
            // Get AI response
            const response = await agentKit.chat(message);
            
            // Remove typing indicator and add real response
            this.removeTypingIndicator();
            this.addMessageToChat('agent', response);
            
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessageToChat('agent', 'Sorry, I encountered an error. Please try again.');
            console.error('Chat error:', error);
        }
    }

    addMessageToChat(sender, message, isTyping = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        if (sender === 'user') {
            messageDiv.className = 'flex justify-end';
            messageDiv.innerHTML = `
                <div class="bg-purple-600 text-white rounded-lg px-4 py-2 max-w-xs">
                    ${message}
                </div>
            `;
        } else {
            messageDiv.className = 'flex justify-start';
            messageDiv.innerHTML = `
                <div class="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-xs ${isTyping ? 'typing-indicator' : ''}">
                    ${isTyping ? '<i class="fas fa-circle-notch fa-spin mr-2"></i>' : '<i class="fas fa-robot mr-2"></i>'}
                    ${message}
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.parentElement.remove();
        }
    }

    async getRecommendations() {
        try {
            const location = document.getElementById('rec-location').value;
            const priceRange = document.getElementById('rec-price').value;
            
            const preferences = {};
            if (location) preferences.location = location;
            if (priceRange) preferences.price_range = priceRange;
            
            const recommendations = await agentKit.getEventRecommendations(preferences);
            
            const resultsContainer = document.getElementById('recommendations-results');
            resultsContainer.innerHTML = '';
            
            if (recommendations.length === 0) {
                resultsContainer.innerHTML = '<p class="text-gray-500 text-center">No recommendations available at the moment.</p>';
                return;
            }
            
            recommendations.forEach(rec => {
                const recDiv = document.createElement('div');
                recDiv.className = 'border border-gray-200 rounded-lg p-3';
                recDiv.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-medium">Event #${rec.event_id}</span>
                        <span class="text-sm text-purple-600">${Math.round(rec.relevance_score * 100)}% match</span>
                    </div>
                    <p class="text-sm text-gray-600">${rec.reason}</p>
                `;
                resultsContainer.appendChild(recDiv);
            });
            
        } catch (error) {
            console.error('Recommendations error:', error);
            showNotification('Failed to get recommendations', 'error');
        }
    }

    async quickHelp(topic) {
        const helpMessages = {
            'metamask': 'I need help with MetaMask connection issues',
            'transaction': 'I\'m having problems with blockchain transactions',
            'event-creation': 'How can I create better events?',
            'profile': 'How can I optimize my profile?'
        };
        
        const message = helpMessages[topic];
        if (!message) return;
        
        try {
            const response = await agentKit.chat(message);
            
            const resultsContainer = document.getElementById('help-results');
            resultsContainer.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 class="font-medium text-blue-900 mb-2">AI Assistant Response:</h5>
                    <div class="text-blue-800 text-sm whitespace-pre-wrap">${response}</div>
                </div>
            `;
            
        } catch (error) {
            console.error('Quick help error:', error);
            showNotification('Failed to get help', 'error');
        }
    }
}

// Initialize AgentKit
const agentKit = new AgentKitManager();
const aiAssistantUI = new AIAssistantUI();

// Global functions
async function askAI(message, context = {}) {
    return await agentKit.chat(message, context);
}

async function getEventRecommendations(preferences = {}) {
    return await agentKit.getEventRecommendations(preferences);
}

async function getEventCreationHelp(userInput, context = {}) {
    return await agentKit.getEventCreationHelp(userInput, context);
}

// Event listeners
eventBus.on('agent:available', (data) => {
    console.log('AI Assistant is ready:', data);
    // Show AI assistant button with animation
    const button = document.getElementById('ai-assistant-btn');
    if (button) {
        button.classList.add('animate-pulse');
        setTimeout(() => button.classList.remove('animate-pulse'), 3000);
    }
});

eventBus.on('page:changed', (data) => {
    // Update context based on current page
    agentKit.updateContext({
        current_page: data.page,
        timestamp: new Date().toISOString()
    });
});

console.log('AgentKit module loaded successfully');