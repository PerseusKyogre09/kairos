// API utility functions
class ApiClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Merge options
        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, requestOptions);
            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                // Handle 401 unauthorized - try to refresh token
                if (response.status === 401 && auth.isAuthenticated()) {
                    const refreshed = await auth.refreshAccessToken();
                    if (refreshed) {
                        // Retry the request with new token
                        requestOptions.headers.Authorization = `Bearer ${auth.token}`;
                        const retryResponse = await fetch(url, requestOptions);
                        const retryData = await retryResponse.json();
                        
                        if (retryResponse.ok) {
                            return { success: true, data: retryData };
                        } else {
                            return { success: false, error: retryData.error || 'Request failed', status: retryResponse.status };
                        }
                    } else {
                        // Refresh failed, logout user
                        auth.logout();
                        return { success: false, error: 'Authentication expired', status: 401 };
                    }
                }
                
                return { success: false, error: data.error || 'Request failed', status: response.status };
            }
        } catch (error) {
            console.error('API request error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    }

    // GET request
    async get(endpoint, headers = {}) {
        return this.request(endpoint, {
            method: 'GET',
            headers
        });
    }

    // POST request
    async post(endpoint, data = null, headers = {}) {
        return this.request(endpoint, {
            method: 'POST',
            headers,
            body: data ? JSON.stringify(data) : null
        });
    }

    // PUT request
    async put(endpoint, data = null, headers = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            headers,
            body: data ? JSON.stringify(data) : null
        });
    }

    // DELETE request
    async delete(endpoint, headers = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            headers
        });
    }

    // Authenticated GET request
    async authGet(endpoint) {
        return this.get(endpoint, auth.getAuthHeaders());
    }

    // Authenticated POST request
    async authPost(endpoint, data = null) {
        return this.post(endpoint, data, auth.getAuthHeaders());
    }

    // Authenticated PUT request
    async authPut(endpoint, data = null) {
        return this.put(endpoint, data, auth.getAuthHeaders());
    }

    // Authenticated DELETE request
    async authDelete(endpoint) {
        return this.delete(endpoint, auth.getAuthHeaders());
    }

    // Upload file
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional data to form
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error || 'Upload failed', status: response.status };
            }
        } catch (error) {
            console.error('File upload error:', error);
            return { success: false, error: error.message || 'Upload failed' };
        }
    }
}

// Initialize API client
const api = new ApiClient();

// Event API functions
const eventAPI = {
    // Get all events
    async getEvents(page = 1, perPage = 10, filters = {}) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString(),
            ...filters
        });

        return api.get(`${CONFIG.ENDPOINTS.EVENTS.LIST}?${params}`);
    },

    // Get single event
    async getEvent(eventId) {
        return api.get(`${CONFIG.ENDPOINTS.EVENTS.GET}/${eventId}`);
    },

    // Create event
    async createEvent(eventData) {
        return api.authPost(CONFIG.ENDPOINTS.EVENTS.CREATE, eventData);
    },

    // Update event
    async updateEvent(eventId, eventData) {
        return api.authPut(`${CONFIG.ENDPOINTS.EVENTS.UPDATE}/${eventId}`, eventData);
    },

    // Delete event
    async deleteEvent(eventId) {
        return api.authDelete(`${CONFIG.ENDPOINTS.EVENTS.DELETE}/${eventId}`);
    },

    // Register for event
    async registerForEvent(eventId, registrationData) {
        return api.authPost(`${CONFIG.ENDPOINTS.EVENTS.REGISTER}/${eventId}/register`, registrationData);
    }
};

// Profile API functions
const profileAPI = {
    // Get current user profile
    async getProfile() {
        return api.authGet(CONFIG.ENDPOINTS.PROFILES.ME);
    },

    // Update profile
    async updateProfile(profileData) {
        return api.authPut(CONFIG.ENDPOINTS.PROFILES.ME, profileData);
    },

    // Update wallet address
    async updateWallet(walletData) {
        return api.authPut(CONFIG.ENDPOINTS.PROFILES.WALLET, walletData);
    },

    // Update skills
    async updateSkills(skills) {
        return api.authPut(CONFIG.ENDPOINTS.PROFILES.SKILLS, { skills });
    },

    // Update interests
    async updateInterests(interests) {
        return api.authPut(CONFIG.ENDPOINTS.PROFILES.INTERESTS, { interests });
    },

    // Get wallet verification message
    async getVerificationMessage() {
        return api.authPost(CONFIG.ENDPOINTS.PROFILES.VERIFY_WALLET);
    },

    // Upload profile image
    async uploadProfileImage(file) {
        return api.uploadFile(CONFIG.ENDPOINTS.PROFILES.PROFILE_IMAGE, file, { profile_image: file });
    },

    // Delete profile image
    async deleteProfileImage() {
        return api.authDelete(CONFIG.ENDPOINTS.PROFILES.PROFILE_IMAGE);
    }
};

// Blockchain API functions
const blockchainAPI = {
    // Get blockchain status
    async getStatus() {
        return api.get(CONFIG.ENDPOINTS.BLOCKCHAIN.STATUS);
    },

    // Get account balance
    async getBalance(address) {
        return api.get(`${CONFIG.ENDPOINTS.BLOCKCHAIN.BALANCE}/${address}`);
    },

    // Create blockchain event
    async createEvent(eventData) {
        return api.authPost(CONFIG.ENDPOINTS.BLOCKCHAIN.EVENTS, eventData);
    },

    // Process payment
    async processPayment(paymentData) {
        return api.authPost(CONFIG.ENDPOINTS.BLOCKCHAIN.PAYMENTS, paymentData);
    },

    // Mint ticket
    async mintTicket(ticketData) {
        return api.authPost(CONFIG.ENDPOINTS.BLOCKCHAIN.TICKETS, ticketData);
    },

    // Get user tickets
    async getUserTickets(address) {
        return api.authGet(`${CONFIG.ENDPOINTS.BLOCKCHAIN.TICKETS}/user/${address}`);
    },

    // Get transaction status
    async getTransactionStatus(txHash) {
        return api.get(`${CONFIG.ENDPOINTS.BLOCKCHAIN.TRANSACTIONS}/${txHash}`);
    }
};

// Utility functions for common API patterns
const apiUtils = {
    // Handle API response with loading and notifications
    async handleApiCall(apiCall, options = {}) {
        const {
            showLoading: shouldShowLoading = true,
            successMessage = null,
            errorMessage = null,
            onSuccess = null,
            onError = null
        } = options;

        try {
            if (shouldShowLoading) {
                showLoading(true);
            }

            const result = await apiCall();

            if (result.success) {
                if (successMessage) {
                    showNotification(successMessage, 'success');
                }
                if (onSuccess) {
                    onSuccess(result.data);
                }
                return result;
            } else {
                const message = errorMessage || result.error || 'Operation failed';
                showNotification(message, 'error');
                if (onError) {
                    onError(result.error);
                }
                return result;
            }
        } catch (error) {
            console.error('API call error:', error);
            const message = errorMessage || error.message || 'An unexpected error occurred';
            showNotification(message, 'error');
            if (onError) {
                onError(error.message);
            }
            return { success: false, error: error.message };
        } finally {
            if (shouldShowLoading) {
                showLoading(false);
            }
        }
    },

    // Paginated data fetcher
    async fetchPaginatedData(fetchFunction, options = {}) {
        const {
            page = 1,
            perPage = 10,
            filters = {},
            onData = null,
            onError = null
        } = options;

        try {
            const result = await fetchFunction(page, perPage, filters);

            if (result.success) {
                if (onData) {
                    onData(result.data);
                }
                return result.data;
            } else {
                if (onError) {
                    onError(result.error);
                }
                return null;
            }
        } catch (error) {
            console.error('Paginated fetch error:', error);
            if (onError) {
                onError(error.message);
            }
            return null;
        }
    }
};

console.log('API module loaded successfully');