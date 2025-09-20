// Authentication module
class AuthManager {
    constructor() {
        this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        this.refreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        this.user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || 'null');
        
        // Update global state
        state.user = this.user;
        
        // Set up token refresh timer
        if (this.token) {
            this.setupTokenRefresh();
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // Get authorization headers
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Login user
    async login(username, password) {
        try {
            showLoading(true);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.setTokens(data.access_token, data.refresh_token);
                this.setUser(data.user);
                
                showNotification('Login successful!', 'success');
                eventBus.emit('auth:login', data.user);
                
                return { success: true, user: data.user };
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Register user
    async register(userData) {
        try {
            showLoading(true);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.AUTH.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Registration successful! Please login.', 'success');
                eventBus.emit('auth:register', data.user);
                
                return { success: true, user: data.user };
            } else {
                throw new Error(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Logout user
    logout() {
        this.clearTokens();
        this.clearUser();
        
        showNotification('Logged out successfully', 'success');
        eventBus.emit('auth:logout');
        
        // Redirect to home page
        showPage('home');
    }

    // Refresh access token
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.AUTH.REFRESH}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.setTokens(data.access_token, this.refreshToken);
                return true;
            } else {
                throw new Error(data.error || 'Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            return false;
        }
    }

    // Set tokens in storage
    setTokens(accessToken, refreshToken) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        
        this.setupTokenRefresh();
    }

    // Clear tokens from storage
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    }

    // Set user data
    setUser(user) {
        this.user = user;
        state.user = user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    }

    // Clear user data
    clearUser() {
        this.user = null;
        state.user = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    }

    // Setup automatic token refresh
    setupTokenRefresh() {
        // Refresh token every 14 minutes (tokens expire in 15 minutes)
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            this.refreshAccessToken();
        }, 14 * 60 * 1000);
    }

    // Get current user profile
    async getCurrentUser() {
        try {
            if (!this.isAuthenticated()) {
                return null;
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.AUTH.PROFILE}`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.setUser(data.user);
                return data.user;
            } else if (response.status === 401) {
                // Token expired, try to refresh
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    return this.getCurrentUser();
                } else {
                    this.logout();
                    return null;
                }
            } else {
                throw new Error('Failed to get user profile');
            }
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }
}

// Initialize auth manager
const auth = new AuthManager();

// Auth event listeners
eventBus.on('auth:login', (user) => {
    updateAuthUI();
    updateNavigation();
});

eventBus.on('auth:logout', () => {
    updateAuthUI();
    updateNavigation();
    
    // Disconnect wallet if connected
    if (state.wallet.connected) {
        disconnectWallet();
    }
});

eventBus.on('auth:register', () => {
    showPage('login');
});

// Update authentication UI
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (auth.isAuthenticated()) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        
        if (auth.user) {
            userName.textContent = auth.user.username;
            if (auth.user.profile_image_url) {
                userAvatar.src = auth.user.profile_image_url;
            }
        }
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// Update navigation based on auth state
function updateNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('onclick');
        
        // Show/hide certain navigation items based on auth state
        if (href && (href.includes('profile') || href.includes('create-event'))) {
            if (auth.isAuthenticated()) {
                link.classList.remove('hidden');
            } else {
                link.classList.add('hidden');
            }
        }
    });
}

// Toggle user dropdown menu
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
}

// Close user dropdown when clicking outside
document.addEventListener('click', (event) => {
    const userMenu = document.getElementById('user-menu');
    const dropdown = document.getElementById('user-dropdown');
    
    if (!userMenu.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Login function for forms
async function loginUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    const result = await auth.login(username, password);
    
    if (result.success) {
        showPage('home');
    }
}

// Register function for forms
async function registerUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name')
    };
    
    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate email format
    if (!utils.isValidEmail(userData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate password length
    if (userData.password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Confirm password
    const confirmPassword = formData.get('confirm_password');
    if (userData.password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    const result = await auth.register(userData);
    
    if (result.success) {
        form.reset();
    }
}

// Logout function
function logout() {
    auth.logout();
}

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateNavigation();
    
    // Try to get current user if authenticated
    if (auth.isAuthenticated()) {
        auth.getCurrentUser();
    }
});

console.log('Auth module loaded successfully');