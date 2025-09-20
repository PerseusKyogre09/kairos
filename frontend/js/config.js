// Configuration and constants
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000',
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'blockevent_access_token',
        REFRESH_TOKEN: 'blockevent_refresh_token',
        USER_DATA: 'blockevent_user_data',
        WALLET_ADDRESS: 'blockevent_wallet_address'
    },
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            REFRESH: '/auth/refresh',
            PROFILE: '/auth/profile'
        },
        EVENTS: {
            LIST: '/events/',
            CREATE: '/events/',
            GET: '/events',
            UPDATE: '/events',
            DELETE: '/events'
        },
        PROFILES: {
            ME: '/profiles/me',
            UPDATE: '/profiles/me',
            WALLET: '/profiles/me/wallet',
            SKILLS: '/profiles/me/skills',
            INTERESTS: '/profiles/me/interests',
            VERIFY_WALLET: '/profiles/me/verify-wallet',
            PROFILE_IMAGE: '/profiles/me/profile-image'
        },
        BLOCKCHAIN: {
            STATUS: '/blockchain/status',
            BALANCE: '/blockchain/balance',
            EVENTS: '/blockchain/events',
            PAYMENTS: '/blockchain/payments',
            TICKETS: '/blockchain/tickets',
            TRANSACTIONS: '/blockchain/transactions'
        },
        AGENT: {
            STATUS: '/api/agent/status',
            CHAT: '/api/agent/chat',
            RECOMMENDATIONS: '/api/agent/recommendations',
            EVENT_HELP: '/api/agent/event-creation-help',
            TROUBLESHOOT: '/api/agent/troubleshoot',
            PROFILE_OPTIMIZATION: '/api/agent/profile-optimization',
            GENERATE_DESCRIPTION: '/api/agent/generate-description',
            SMART_SUGGESTIONS: '/api/agent/smart-suggestions'
        }
    },
    WALLET: {
        CHAIN_ID: '0x1', // Ethereum Mainnet
        CHAIN_NAME: 'Ethereum Mainnet',
        RPC_URL: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        CURRENCY: {
            NAME: 'Ether',
            SYMBOL: 'ETH',
            DECIMALS: 18
        }
    }
};

// Utility functions
const utils = {
    // Format wallet address for display
    formatAddress: (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },

    // Format date for display
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format price in ETH
    formatPrice: (price) => {
        return `${parseFloat(price).toFixed(4)} ETH`;
    },

    // Debounce function for search
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Validate email format
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate Ethereum address
    isValidAddress: (address) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    },

    // Copy text to clipboard
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            showNotification('Failed to copy to clipboard', 'error');
        }
    },

    // Generate random ID
    generateId: () => {
        return Math.random().toString(36).substr(2, 9);
    }
};

// Global state management
const state = {
    user: null,
    wallet: {
        connected: false,
        address: null,
        provider: null
    },
    events: [],
    currentPage: 'home',
    loading: false
};

// Event emitter for state changes
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

const eventBus = new EventEmitter();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('An unexpected error occurred', 'error');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred', 'error');
});

console.log('Config loaded successfully');