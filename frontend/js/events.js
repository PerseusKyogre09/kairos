// Events management module
class EventsManager {
    constructor() {
        this.events = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {};
        this.searchTerm = '';
    }

    // Load events with pagination and filters
    async loadEvents(page = 1, perPage = 12) {
        try {
            showLoading(true);
            
            const filters = {
                ...this.filters,
                search: this.searchTerm
            };

            const result = await eventAPI.getEvents(page, perPage, filters);
            
            if (result.success) {
                this.events = result.data.events;
                this.currentPage = result.data.pagination.page;
                this.totalPages = result.data.pagination.pages;
                
                this.renderEvents();
                this.renderPagination();
                
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to load events');
            }
        } catch (error) {
            console.error('Load events error:', error);
            showNotification('Failed to load events', 'error');
            this.renderEmptyState();
        } finally {
            showLoading(false);
        }
    }

    // Search events
    async searchEvents(searchTerm) {
        this.searchTerm = searchTerm;
        this.currentPage = 1;
        await this.loadEvents();
    }

    // Filter events
    async filterEvents(filters) {
        this.filters = { ...this.filters, ...filters };
        this.currentPage = 1;
        await this.loadEvents();
    }

    // Render events grid
    renderEvents() {
        const eventsGrid = document.getElementById('events-grid');
        const eventsLoading = document.getElementById('events-loading');
        const eventsEmpty = document.getElementById('events-empty');

        if (!eventsGrid) return;

        eventsLoading.classList.add('hidden');
        
        if (this.events.length === 0) {
            eventsEmpty.classList.remove('hidden');
            eventsGrid.innerHTML = '';
            return;
        }

        eventsEmpty.classList.add('hidden');
        eventsGrid.innerHTML = this.events.map(event => this.renderEventCard(event)).join('');
    }

    // Render single event card
    renderEventCard(event) {
        const isUpcoming = new Date(event.start_date) > new Date();
        const isPast = new Date(event.start_date) < new Date();
        
        return `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden card-hover">
                <!-- Event Image Placeholder -->
                <div class="h-48 bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
                    <i class="fas fa-calendar-alt text-white text-4xl"></i>
                </div>
                
                <div class="p-6">
                    <!-- Event Status Badge -->
                    <div class="flex justify-between items-start mb-3">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isUpcoming ? 'bg-green-100 text-green-800' : 
                            isPast ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                        }">
                            ${isUpcoming ? 'Upcoming' : isPast ? 'Past' : 'Live'}
                        </span>
                        <button onclick="toggleEventFavorite(${event.id})" class="text-gray-400 hover:text-red-500 transition-colors">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                    
                    <!-- Event Title -->
                    <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${event.title}</h3>
                    
                    <!-- Event Description -->
                    <p class="text-gray-600 text-sm mb-4 line-clamp-3">${event.description}</p>
                    
                    <!-- Event Details -->
                    <div class="space-y-2 mb-4">
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-calendar-alt w-4 mr-2"></i>
                            <span>${utils.formatDate(event.start_date)}</span>
                        </div>
                        
                        ${event.location ? `
                            <div class="flex items-center text-sm text-gray-500">
                                <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                                <span class="truncate">${event.location}</span>
                            </div>
                        ` : ''}
                        
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-ticket-alt w-4 mr-2"></i>
                            <span class="font-semibold text-primary-600">${utils.formatPrice(event.ticket_price)}</span>
                        </div>
                        
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-users w-4 mr-2"></i>
                            <span>${event.capacity} spots</span>
                        </div>
                    </div>
                    
                    <!-- Organizer Info -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                                <i class="fas fa-user text-gray-600 text-xs"></i>
                            </div>
                            <span class="text-sm text-gray-600">by ${event.organizer.username}</span>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex space-x-2">
                        <button onclick="viewEventDetails(${event.id})" 
                                class="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                            View Details
                        </button>
                        ${isUpcoming ? `
                            <button onclick="purchaseTicket(${event.id})" 
                                    class="flex-1 border border-primary-600 text-primary-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors">
                                Buy Ticket
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('events-pagination');
        if (!paginationContainer || this.totalPages <= 1) return;

        let paginationHTML = '<div class="flex justify-center items-center space-x-2 mt-8">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button onclick="eventsManager.loadEvents(${this.currentPage - 1})" 
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <button onclick="eventsManager.loadEvents(${i})" 
                        class="px-3 py-2 text-sm font-medium ${
                            isActive 
                                ? 'text-white bg-primary-600 border border-primary-600' 
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        } rounded-md">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (this.currentPage < this.totalPages) {
            paginationHTML += `
                <button onclick="eventsManager.loadEvents(${this.currentPage + 1})" 
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    // Render empty state
    renderEmptyState() {
        const eventsGrid = document.getElementById('events-grid');
        const eventsEmpty = document.getElementById('events-empty');
        
        if (eventsGrid) eventsGrid.innerHTML = '';
        if (eventsEmpty) eventsEmpty.classList.remove('hidden');
    }

    // Create new event
    async createEvent(eventData) {
        try {
            showLoading(true);
            
            const result = await eventAPI.createEvent(eventData);
            
            if (result.success) {
                showNotification('Event created successfully!', 'success');
                
                // Optionally create on blockchain
                if (state.wallet.connected) {
                    await this.createBlockchainEvent(result.data.event);
                }
                
                // Redirect to events page
                showPage('events');
                
                return result;
            } else {
                throw new Error(result.error || 'Failed to create event');
            }
        } catch (error) {
            console.error('Create event error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Create event on blockchain
    async createBlockchainEvent(event) {
        try {
            const blockchainData = {
                title: event.title,
                start_date: Math.floor(new Date(event.start_date).getTime() / 1000),
                ticket_price: event.ticket_price,
                capacity: event.capacity
            };
            
            const result = await blockchainAPI.createEvent(blockchainData);
            
            if (result.success) {
                showNotification('Event created on blockchain!', 'success');
                return result.data.transaction_hash;
            } else {
                console.warn('Blockchain event creation failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('Blockchain event creation error:', error);
            return null;
        }
    }

    // Get event details
    async getEventDetails(eventId) {
        try {
            showLoading(true);
            
            const result = await eventAPI.getEvent(eventId);
            
            if (result.success) {
                return result.data.event;
            } else {
                throw new Error(result.error || 'Failed to get event details');
            }
        } catch (error) {
            console.error('Get event details error:', error);
            showNotification(error.message, 'error');
            return null;
        } finally {
            showLoading(false);
        }
    }

    // Check if user already has a ticket for this event
    async checkUserTicket(eventId) {
        try {
            if (!state.wallet.connected) return false;
            
            const result = await blockchainAPI.getUserTickets(state.wallet.address);
            
            // Handle offline mode gracefully
            if (result.success) {
                if (result.data.offline_mode) {
                    console.log('Blockchain in offline mode - skipping ticket check');
                    return false; // Allow purchase in offline mode
                }
                
                if (result.data.tickets) {
                    return result.data.tickets.some(ticket => ticket.event_id === eventId);
                }
            }
            
            return false;
        } catch (error) {
            console.error('Check user ticket error:', error);
            return false; // Allow purchase if check fails
        }
    }

    // Purchase ticket
    async purchaseTicket(eventId) {
        try {
            if (!auth.isAuthenticated()) {
                showNotification('Please login to purchase tickets', 'error');
                showPage('login');
                return;
            }

            if (!state.wallet.connected) {
                showNotification('Please connect your MetaMask wallet to purchase tickets', 'error');
                return;
            }

            // Check if user already has a ticket
            const hasTicket = await this.checkUserTicket(eventId);
            if (hasTicket) {
                showNotification('You already have a ticket for this event', 'info');
                return;
            }

            showLoading(true);
            
            // Get event details
            const event = await this.getEventDetails(eventId);
            if (!event) return;

            // Use the connected MetaMask address directly
            if (!state.wallet.address) {
                showNotification('Please connect your MetaMask wallet first', 'error');
                return;
            }

            // Check if organizer has a wallet address (fallback to a default for testing)
            const organizerAddress = event.organizer.wallet_address || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Default test address
            
            if (!event.organizer.wallet_address) {
                console.warn('Organizer has no wallet address, using default test address');
            }

            // Register for event (which handles payment and NFT minting)
            const registrationData = {
                wallet_address: state.wallet.address,
                organizer_address: organizerAddress
            };
            
            const result = await eventAPI.registerForEvent(eventId, registrationData);
            
            if (result.success) {
                showNotification('Registration successful! Your NFT ticket has been minted.', 'success');
                
                // Monitor transaction
                this.monitorTransaction(result.data.transaction_hash, 'ticket_purchase');
                
                return result;
            } else {
                throw new Error(result.error || 'Failed to register for event');
            }
        } catch (error) {
            console.error('Purchase ticket error:', error);
            let errorMessage = 'Failed to purchase ticket';
            
            if (error.message.includes('User denied')) {
                errorMessage = 'Transaction was cancelled by user';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for transaction';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('contract')) {
                errorMessage = 'Smart contract error. Please try again.';
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Monitor blockchain transaction
    async monitorTransaction(txHash, type) {
        const maxAttempts = 30; // 5 minutes with 10-second intervals
        let attempts = 0;
        
        const checkStatus = async () => {
            try {
                const result = await blockchainAPI.getTransactionStatus(txHash);
                
                if (result.success) {
                    const status = result.data.status;
                    
                    if (status === 'confirmed') {
                        this.handleTransactionSuccess(txHash, type);
                        return;
                    } else if (status === 'failed') {
                        this.handleTransactionFailure(txHash, type);
                        return;
                    }
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 10000); // Check again in 10 seconds
                } else {
                    showNotification('Transaction monitoring timed out. Please check manually.', 'warning');
                }
            } catch (error) {
                console.error('Transaction monitoring error:', error);
            }
        };
        
        // Start monitoring
        setTimeout(checkStatus, 5000); // First check after 5 seconds
    }

    // Handle successful transaction
    handleTransactionSuccess(txHash, type) {
        switch (type) {
            case 'ticket_purchase':
                showNotification('Ticket purchased successfully! NFT ticket has been minted.', 'success');
                break;
            case 'event_creation':
                showNotification('Event created on blockchain successfully!', 'success');
                break;
            default:
                showNotification('Transaction completed successfully!', 'success');
        }
        
        eventBus.emit('transaction:success', { txHash, type });
    }

    // Handle failed transaction
    handleTransactionFailure(txHash, type) {
        switch (type) {
            case 'ticket_purchase':
                showNotification('Ticket purchase failed. Please try again.', 'error');
                break;
            case 'event_creation':
                showNotification('Blockchain event creation failed.', 'error');
                break;
            default:
                showNotification('Transaction failed.', 'error');
        }
        
        eventBus.emit('transaction:failure', { txHash, type });
    }
}

// Initialize events manager
const eventsManager = new EventsManager();

// Global event functions
async function viewEventDetails(eventId) {
    const event = await eventsManager.getEventDetails(eventId);
    if (event) {
        // TODO: Show event details modal or navigate to details page
        showNotification('Event details modal coming soon!', 'info');
    }
}

async function purchaseTicket(eventId) {
    await eventsManager.purchaseTicket(eventId);
}

function toggleEventFavorite(eventId) {
    // TODO: Implement favorites functionality
    showNotification('Favorites feature coming soon!', 'info');
}

// Setup search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('event-search');
    if (searchInput) {
        const debouncedSearch = utils.debounce((searchTerm) => {
            eventsManager.searchEvents(searchTerm);
        }, 500);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    const filterSelect = document.getElementById('event-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            const filter = e.target.value;
            const filters = {};
            
            if (filter === 'upcoming') {
                filters.active_only = true;
            } else if (filter === 'past') {
                filters.active_only = false;
            }
            
            eventsManager.filterEvents(filters);
        });
    }
});

// Event listeners
eventBus.on('page:changed', (data) => {
    if (data.page === 'events') {
        // Reload events when navigating to events page
        setTimeout(() => {
            eventsManager.loadEvents();
        }, 100);
    }
});

eventBus.on('auth:login', () => {
    // Reload events to show user-specific data
    if (eventsManager.currentPage) {
        eventsManager.loadEvents(eventsManager.currentPage);
    }
});

console.log('Events module loaded successfully');