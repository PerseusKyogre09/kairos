// Main application controller
class App {
    constructor() {
        this.currentPage = 'home';
        this.pages = {};
        this.initialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Initialize components
            await this.loadPages();
            this.setupEventListeners();
            this.setupRouting();
            
            // Initialize auth state
            updateAuthUI();
            updateNavigation();
            
            // Initialize wallet state
            wallet.updateWalletUI();
            
            // Check blockchain status
            this.checkBlockchainStatus();
            
            // Load initial page
            const hash = window.location.hash.slice(1) || 'home';
            this.showPage(hash);
            
            this.initialized = true;
            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            showNotification('Failed to initialize application', 'error');
        }
    }

    async loadPages() {
        // Load page templates
        this.pages = {
            home: () => this.renderHomePage(),
            login: () => this.loadExternalPage('login'),
            register: () => this.loadExternalPage('register'),
            events: () => this.loadExternalPage('events', () => this.initEventsPage()),
            'create-event': () => this.loadExternalPage('create-event', () => this.initCreateEventPage()),
            'my-tickets': () => this.loadExternalPage('my-tickets', () => this.initMyTicketsPage()),
            profile: () => this.loadExternalPage('profile', () => this.initProfilePage()),
            'my-events': () => this.loadExternalPage('my-events', () => this.initMyEventsPage())
        };

        // Preload common pages
        pageLoader.preloadPages(['login', 'register', 'events']);
    }

    setupEventListeners() {
        // Global click handler for navigation
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-page]');
            if (target) {
                event.preventDefault();
                const page = target.getAttribute('data-page');
                this.showPage(page);
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            const page = window.location.hash.slice(1) || 'home';
            this.showPage(page, false);
        });

        // Handle form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const action = form.getAttribute('data-action');
            
            if (action) {
                event.preventDefault();
                this.handleFormSubmission(form, action);
            }
        });
    }

    setupRouting() {
        // Simple hash-based routing
        window.addEventListener('hashchange', () => {
            const page = window.location.hash.slice(1) || 'home';
            this.showPage(page, false);
        });
    }

    showPage(pageName, updateHistory = true) {
        if (!this.pages[pageName]) {
            console.error(`Page '${pageName}' not found`);
            pageName = 'home';
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Update navigation
        this.updateNavigation(pageName);

        // Show target page
        const pageElement = document.getElementById(`${pageName}-page`);
        if (pageElement) {
            pageElement.classList.remove('hidden');
            
            // Render page content
            if (this.pages[pageName]) {
                this.pages[pageName]();
            }
        }

        // Update URL and history
        if (updateHistory) {
            if (pageName === 'home') {
                window.location.hash = '';
            } else {
                window.location.hash = pageName;
            }
        }

        this.currentPage = pageName;
        
        // Emit page change event
        eventBus.emit('page:changed', { page: pageName });
    }

    updateNavigation(activePage) {
        // Update navigation active states
        document.querySelectorAll('.nav-link').forEach(link => {
            const dataPage = link.getAttribute('data-page');
            if (dataPage && dataPage === activePage) {
                link.classList.remove('text-gray-500');
                link.classList.add('text-gray-900');
            } else {
                link.classList.remove('text-gray-900');
                link.classList.add('text-gray-500');
            }
        });
    }

    async handleFormSubmission(form, action) {
        const formData = new FormData(form);
        
        switch (action) {
            case 'login':
                await loginUser({ target: form, preventDefault: () => {} });
                break;
            case 'register':
                await registerUser({ target: form, preventDefault: () => {} });
                break;
            case 'create-event':
                await this.handleCreateEvent(formData);
                break;
            case 'update-profile':
                await this.handleUpdateProfile(formData);
                break;
            default:
                console.warn(`Unknown form action: ${action}`);
        }
    }

    async handleCreateEvent(formData) {
        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            ticket_price: parseFloat(formData.get('ticket_price')),
            capacity: parseInt(formData.get('capacity')),
            location: formData.get('location')
        };

        const result = await apiUtils.handleApiCall(
            () => eventAPI.createEvent(eventData),
            {
                successMessage: 'Event created successfully!',
                errorMessage: 'Failed to create event',
                onSuccess: () => {
                    this.showPage('events');
                }
            }
        );
    }

    async handleUpdateProfile(formData) {
        const profileData = {
            bio: formData.get('bio'),
            location: formData.get('location'),
            website: formData.get('website'),
            linkedin_url: formData.get('linkedin_url'),
            twitter_handle: formData.get('twitter_handle'),
            github_username: formData.get('github_username'),
            is_profile_public: formData.get('is_profile_public') === 'on'
        };

        const result = await apiUtils.handleApiCall(
            () => profileAPI.updateProfile(profileData),
            {
                successMessage: 'Profile updated successfully!',
                errorMessage: 'Failed to update profile'
            }
        );
    }

    // Check blockchain connection status
    async checkBlockchainStatus() {
        try {
            const result = await blockchainAPI.getStatus();
            this.updateBlockchainStatusUI(result.success && result.data.connected);
        } catch (error) {
            console.error('Blockchain status check failed:', error);
            this.updateBlockchainStatusUI(false);
        }
    }

    // Update blockchain status UI
    updateBlockchainStatusUI(isConnected) {
        const statusElement = document.getElementById('blockchain-status');
        const connectedElement = document.getElementById('blockchain-connected');
        const offlineElement = document.getElementById('blockchain-offline');

        if (!statusElement) return;

        statusElement.classList.remove('hidden');

        if (isConnected) {
            connectedElement.classList.remove('hidden');
            offlineElement.classList.add('hidden');
        } else {
            connectedElement.classList.add('hidden');
            offlineElement.classList.remove('hidden');
        }
    }

    // Load external page content
    async loadExternalPage(pageName, initCallback) {
        const pageElement = document.getElementById(`${pageName}-page`);
        if (!pageElement) {
            console.error(`Page element ${pageName}-page not found`);
            return;
        }

        try {
            console.log(`Loading page: ${pageName}`);
            const content = await pageLoader.loadPage(pageName);
            pageElement.innerHTML = content;
            console.log(`Page ${pageName} loaded successfully`);
            
            // Run initialization callback if provided
            if (initCallback && typeof initCallback === 'function') {
                console.log(`Running init callback for ${pageName}`);
                initCallback();
            }
        } catch (error) {
            console.error(`Failed to load page ${pageName}:`, error);
            pageElement.innerHTML = `<div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Page Load Error</h3>
                <p class="text-gray-600">Failed to load page content: ${error.message}</p>
            </div>`;
        }
    }

    // Page renderers
    renderHomePage() {
        // Home page is static, no dynamic content needed
    }

    initEventsPage() {
        // Load events when page is initialized
        this.loadEvents();
    }

    initCreateEventPage() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            showNotification('Please login to create events', 'error');
            this.showPage('login');
            return;
        }
    }



    async loadEvents() {
        const eventsGrid = document.getElementById('events-grid');
        const eventsLoading = document.getElementById('events-loading');
        const eventsEmpty = document.getElementById('events-empty');

        // Show loading state
        eventsLoading.classList.remove('hidden');
        eventsGrid.innerHTML = '';
        eventsEmpty.classList.add('hidden');

        try {
            const result = await eventAPI.getEvents();
            
            if (result.success && result.data.events.length > 0) {
                eventsGrid.innerHTML = result.data.events.map(event => this.renderEventCard(event)).join('');
            } else {
                eventsEmpty.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Load events error:', error);
            showNotification('Failed to load events', 'error');
            eventsEmpty.classList.remove('hidden');
        } finally {
            eventsLoading.classList.add('hidden');
        }
    }

    renderEventCard(event) {
        return `
            <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 card-hover">
                <div class="mb-4">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">${event.title}</h3>
                    <p class="text-gray-600 text-sm line-clamp-3">${event.description}</p>
                </div>
                
                <div class="space-y-2 mb-4">
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-calendar mr-2"></i>
                        ${utils.formatDate(event.start_date)}
                    </div>
                    ${event.location ? `
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-map-marker-alt mr-2"></i>
                            ${event.location}
                        </div>
                    ` : ''}
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-ticket-alt mr-2"></i>
                        ${utils.formatPrice(event.ticket_price)}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-users mr-2"></i>
                        ${event.capacity} attendees
                    </div>
                </div>
                
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-500">by ${event.organizer.username}</span>
                    <button onclick="viewEvent(${event.id})" class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }



    initMyTicketsPage() {
        console.log('Initializing My Tickets page');
        
        // Load user tickets
        setTimeout(() => {
            console.log('TicketsManager available:', !!window.ticketsManager);
            console.log('Auth state:', auth.isAuthenticated());
            console.log('Wallet state:', state.wallet.connected);
            
            if (window.ticketsManager) {
                console.log('Loading user tickets...');
                window.ticketsManager.loadUserTickets();
            } else {
                console.warn('TicketsManager not available');
                // Show a fallback message
                const container = document.getElementById('tickets-container');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-12">
                            <i class="fas fa-ticket-alt text-gray-400 text-4xl mb-4"></i>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Tickets Manager Loading</h3>
                            <p class="text-gray-600">Please wait while we load your tickets...</p>
                            <button onclick="refreshTickets()" class="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                                Try Again
                            </button>
                        </div>
                    `;
                } else {
                    console.error('tickets-container element not found');
                }
            }
        }, 100);
    }

    initProfilePage() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            showNotification('Please login to view profile', 'error');
            this.showPage('login');
            return;
        }

        // Wait a bit for the DOM to be ready, then load data
        setTimeout(() => {
            this.loadProfileData();
            this.loadUserTickets();
        }, 100);
    }

    async loadUserTickets() {
        const ticketsSection = document.getElementById('user-tickets-section');
        if (!ticketsSection) {
            console.warn('user-tickets-section element not found');
            return;
        }

        if (!state.wallet.connected || !state.wallet.address) {
            ticketsSection.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-wallet text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-600">Connect your wallet to view your NFT tickets</p>
                </div>
            `;
            return;
        }

        try {
            const result = await blockchainAPI.getUserTickets(state.wallet.address);
            
            if (result.success) {
                this.renderUserTickets(result.data.tickets);
            } else {
                ticketsSection.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-exclamation-triangle text-yellow-400 text-4xl mb-4"></i>
                        <p class="text-gray-600">Failed to load tickets</p>
                        <p class="text-sm text-gray-500">${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Load user tickets error:', error);
            ticketsSection.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-4"></i>
                    <p class="text-gray-600">Error loading tickets</p>
                    <p class="text-sm text-gray-500">${error.message}</p>
                </div>
            `;
        }
    }

    renderUserTickets(tickets) {
        const ticketsSection = document.getElementById('user-tickets-section');
        
        if (!tickets || tickets.length === 0) {
            ticketsSection.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-ticket-alt text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-600">No NFT tickets found</p>
                    <p class="text-sm text-gray-500">Purchase tickets for events to see them here</p>
                </div>
            `;
            return;
        }

        const ticketsHTML = tickets.map(ticket => `
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-ticket-alt text-purple-600 mr-2"></i>
                            <h4 class="font-semibold text-gray-900">Ticket #${ticket.token_id}</h4>
                            <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                ticket.is_used ? 'bg-red-100 text-red-800' : 
                                ticket.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }">
                                ${ticket.is_used ? 'Used' : ticket.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                                <span class="font-medium">Event ID:</span> ${ticket.event_id}
                            </div>
                            <div>
                                <span class="font-medium">Type:</span> ${ticket.ticket_type}
                            </div>
                            <div>
                                <span class="font-medium">Seat:</span> ${ticket.seat_info}
                            </div>
                            <div>
                                <span class="font-medium">Purchased:</span> ${new Date(ticket.purchase_date * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <div class="ml-4">
                        <button onclick="viewTicketDetails(${ticket.token_id})" 
                                class="text-purple-600 hover:text-purple-800 text-sm font-medium">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        ticketsSection.innerHTML = `
            <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900">Your NFT Tickets (${tickets.length})</h3>
                <button onclick="refreshUserTickets()" class="text-sm text-purple-600 hover:text-purple-800">
                    <i class="fas fa-sync-alt mr-1"></i>Refresh
                </button>
            </div>
            ${ticketsHTML}
        `;
    }

    async loadProfileData() {
        try {
            const result = await profileAPI.getProfile();
            if (result.success) {
                const profile = result.data.profile;
                
                // Populate form fields
                const form = document.querySelector('[data-action="update-profile"]');
                if (form) {
                    Object.keys(profile).forEach(key => {
                        const field = form.querySelector(`[name="${key}"]`);
                        if (field) {
                            if (field.type === 'checkbox') {
                                field.checked = profile[key];
                            } else {
                                field.value = profile[key] || '';
                            }
                        }
                    });
                } else {
                    console.warn('Profile form not found');
                }
            }
        } catch (error) {
            console.error('Load profile error:', error);
            showNotification('Failed to load profile data', 'error');
        }
    }

    initMyEventsPage() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            showNotification('Please login to view your events', 'error');
            this.showPage('login');
            return;
        }

        // Load user's events (placeholder for now)
        // TODO: Implement loadMyEvents() method
    }
}

// Global functions
function showPage(pageName) {
    if (window.app) {
        window.app.showPage(pageName);
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        state.loading = true;
    } else {
        overlay.classList.add('hidden');
        state.loading = false;
    }
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');
    
    // Set icon and color based on type
    const config = {
        success: { icon: 'fas fa-check-circle text-green-500', border: 'border-green-500' },
        error: { icon: 'fas fa-exclamation-circle text-red-500', border: 'border-red-500' },
        warning: { icon: 'fas fa-exclamation-triangle text-yellow-500', border: 'border-yellow-500' },
        info: { icon: 'fas fa-info-circle text-blue-500', border: 'border-blue-500' }
    };
    
    const typeConfig = config[type] || config.info;
    
    icon.className = typeConfig.icon;
    toast.querySelector('.border-l-4').className = `bg-white rounded-lg shadow-lg border-l-4 p-4 ${typeConfig.border}`;
    messageEl.textContent = message;
    
    toast.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    const toast = document.getElementById('notification-toast');
    toast.classList.add('hidden');
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

function viewEvent(eventId) {
    // TODO: Implement event detail view
    showNotification('Event details coming soon!', 'info');
}

function loadEvents() {
    if (window.app) {
        window.app.loadEvents();
    }
}

function viewTicketDetails(tokenId) {
    // TODO: Implement ticket details modal
    showNotification(`Viewing details for ticket #${tokenId}`, 'info');
}

function refreshUserTickets() {
    if (window.app) {
        window.app.loadUserTickets();
    }
}

function refreshTickets() {
    if (window.ticketsManager) {
        window.ticketsManager.loadUserTickets();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

console.log('App module loaded successfully');