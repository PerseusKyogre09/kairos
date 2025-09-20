// NFT Tickets management module
class TicketsManager {
    constructor() {
        this.tickets = [];
        this.events = new Map(); // Cache for event details
    }

    // Load user's tickets
    async loadUserTickets() {
        try {
            if (!auth.isAuthenticated()) {
                showNotification('Please login to view your tickets', 'error');
                showPage('login');
                return;
            }

            if (!state.wallet.connected) {
                showNotification('Please connect your wallet to view tickets', 'info');
                this.renderEmptyState('Connect your wallet to view your NFT tickets');
                return;
            }

            showLoading(true);

            // Get tickets from blockchain
            const result = await blockchainAPI.getUserTickets(state.wallet.address);
            
            if (result.success) {
                this.tickets = result.data.tickets || [];
                
                if (result.data.offline_mode) {
                    // In offline mode, create some dummy tickets for demonstration
                    this.tickets = await this.generateDummyTickets();
                    showNotification('Showing demo tickets (offline mode)', 'info');
                }

                // Load event details for each ticket
                await this.loadEventDetails();
                
                this.renderTickets();
            } else {
                throw new Error(result.error || 'Failed to load tickets');
            }
        } catch (error) {
            console.error('Load tickets error:', error);
            showNotification('Failed to load tickets', 'error');
            this.renderEmptyState('Failed to load tickets. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    // Generate dummy tickets for offline mode demonstration
    async generateDummyTickets() {
        const dummyTickets = [];
        
        // Get some events from the database to create tickets for
        try {
            const eventsResult = await eventAPI.getEvents(1, 5);
            if (eventsResult.success && eventsResult.data.events.length > 0) {
                eventsResult.data.events.forEach((event, index) => {
                    if (index < 3) { // Create tickets for first 3 events
                        dummyTickets.push({
                            token_id: index + 1,
                            event_id: event.id,
                            event_contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
                            purchaser: state.wallet.address,
                            purchase_date: Math.floor(Date.now() / 1000) - (index * 86400), // Different purchase dates
                            is_used: index === 2, // Mark one as used
                            is_active: true,
                            seat_info: `Seat-${index + 1}`,
                            ticket_type: index === 0 ? 'VIP' : 'Standard'
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error generating dummy tickets:', error);
        }

        return dummyTickets;
    }

    // Load event details for tickets
    async loadEventDetails() {
        const eventIds = [...new Set(this.tickets.map(ticket => ticket.event_id))];
        
        for (const eventId of eventIds) {
            if (!this.events.has(eventId)) {
                try {
                    const result = await eventAPI.getEvent(eventId);
                    if (result.success) {
                        this.events.set(eventId, result.data.event);
                    }
                } catch (error) {
                    console.error(`Failed to load event ${eventId}:`, error);
                }
            }
        }
    }

    // Render tickets grid
    renderTickets() {
        const ticketsContainer = document.getElementById('tickets-container');
        if (!ticketsContainer) return;

        if (this.tickets.length === 0) {
            this.renderEmptyState('No tickets found. Purchase tickets for events to see them here.');
            return;
        }

        ticketsContainer.innerHTML = `
            <div class="mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">My NFT Tickets</h2>
                <p class="text-gray-600">Your collection of event tickets stored as NFTs on the blockchain</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${this.tickets.map(ticket => this.renderTicketCard(ticket)).join('')}
            </div>
        `;
    }

    // Render individual ticket card with unique design
    renderTicketCard(ticket) {
        const event = this.events.get(ticket.event_id);
        if (!event) {
            return this.renderLoadingTicketCard(ticket);
        }

        const isUsed = ticket.is_used;
        const isVIP = ticket.ticket_type === 'VIP';
        const purchaseDate = new Date(ticket.purchase_date * 1000);
        const eventDate = new Date(event.start_date);
        const isUpcoming = eventDate > new Date();
        
        // Generate unique gradient based on event ID
        const gradients = [
            'from-purple-500 to-pink-500',
            'from-blue-500 to-cyan-500',
            'from-green-500 to-teal-500',
            'from-orange-500 to-red-500',
            'from-indigo-500 to-purple-500',
            'from-pink-500 to-rose-500',
            'from-cyan-500 to-blue-500',
            'from-teal-500 to-green-500'
        ];
        const gradient = gradients[ticket.event_id % gradients.length];

        // Generate unique pattern based on token ID
        const patterns = [
            'opacity-10 transform rotate-12',
            'opacity-10 transform -rotate-12',
            'opacity-10 transform rotate-45',
            'opacity-10 transform -rotate-45'
        ];
        const pattern = patterns[ticket.token_id % patterns.length];

        return `
            <div class="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl" 
                 onclick="ticketsManager.viewTicketDetails(${ticket.token_id})">
                
                <!-- Ticket Card -->
                <div class="relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 ${isUsed ? 'border-gray-300' : 'border-transparent'}">
                    
                    <!-- Header with gradient background -->
                    <div class="relative h-32 bg-gradient-to-br ${gradient} ${isUsed ? 'grayscale' : ''}">
                        <!-- Background pattern -->
                        <div class="absolute inset-0 bg-white ${pattern}">
                            <div class="w-full h-full" style="background-image: radial-gradient(circle at 20% 50%, white 2px, transparent 2px), radial-gradient(circle at 80% 50%, white 2px, transparent 2px); background-size: 20px 20px;"></div>
                        </div>
                        
                        <!-- Status badges -->
                        <div class="absolute top-4 left-4 flex space-x-2">
                            ${isVIP ? '<span class="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">VIP</span>' : ''}
                            ${isUsed ? '<span class="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-bold">USED</span>' : 
                              isUpcoming ? '<span class="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">VALID</span>' : 
                              '<span class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">EXPIRED</span>'}
                        </div>
                        
                        <!-- Token ID -->
                        <div class="absolute top-4 right-4">
                            <span class="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-mono">
                                #${ticket.token_id.toString().padStart(4, '0')}
                            </span>
                        </div>
                        
                        <!-- Event icon -->
                        <div class="absolute bottom-4 left-4">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <i class="fas fa-calendar-alt text-white text-xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Ticket content -->
                    <div class="p-6">
                        <!-- Event title -->
                        <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">${event.title}</h3>
                        
                        <!-- Event details -->
                        <div class="space-y-2 mb-4">
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-calendar w-4 mr-2"></i>
                                <span>${utils.formatDate(event.start_date)}</span>
                            </div>
                            
                            ${event.location ? `
                                <div class="flex items-center text-sm text-gray-600">
                                    <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                                    <span class="truncate">${event.location}</span>
                                </div>
                            ` : ''}
                            
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-chair w-4 mr-2"></i>
                                <span>${ticket.seat_info}</span>
                            </div>
                        </div>
                        
                        <!-- Ticket info -->
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-500">Purchased</span>
                                <span class="font-medium">${utils.formatDate(purchaseDate)}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm mt-1">
                                <span class="text-gray-500">Price</span>
                                <span class="font-medium">${utils.formatPrice(event.ticket_price)}</span>
                            </div>
                        </div>
                        
                        <!-- QR Code placeholder -->
                        <div class="mt-4 flex justify-center">
                            <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-qrcode text-gray-400 text-2xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Ticket stub perforation -->
                    <div class="absolute right-0 top-1/2 transform -translate-y-1/2">
                        <div class="w-6 h-6 bg-gray-50 rounded-full border-2 border-white"></div>
                    </div>
                    <div class="absolute left-0 top-1/2 transform -translate-y-1/2">
                        <div class="w-6 h-6 bg-gray-50 rounded-full border-2 border-white"></div>
                    </div>
                </div>
                
                <!-- Hover effect overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
            </div>
        `;
    }

    // Render loading ticket card
    renderLoadingTicketCard(ticket) {
        return `
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div class="h-32 bg-gray-300"></div>
                <div class="p-6">
                    <div class="h-4 bg-gray-300 rounded mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded mb-4 w-3/4"></div>
                    <div class="space-y-2">
                        <div class="h-3 bg-gray-300 rounded w-1/2"></div>
                        <div class="h-3 bg-gray-300 rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render empty state
    renderEmptyState(message) {
        const ticketsContainer = document.getElementById('tickets-container');
        if (!ticketsContainer) return;

        ticketsContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-ticket-alt text-gray-400 text-3xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No Tickets Found</h3>
                <p class="text-gray-500 mb-6">${message}</p>
                <div class="space-x-4">
                    <button onclick="showPage('events')" 
                            class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                        Browse Events
                    </button>
                    ${!state.wallet.connected ? `
                        <button onclick="connectWallet()" 
                                class="border border-primary-600 text-primary-600 px-6 py-2 rounded-lg hover:bg-primary-50 transition-colors">
                            Connect Wallet
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // View ticket details in modal
    async viewTicketDetails(tokenId) {
        const ticket = this.tickets.find(t => t.token_id === tokenId);
        const event = this.events.get(ticket.event_id);
        
        if (!ticket || !event) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };

        const gradients = [
            'from-purple-500 to-pink-500',
            'from-blue-500 to-cyan-500',
            'from-green-500 to-teal-500',
            'from-orange-500 to-red-500',
            'from-indigo-500 to-purple-500',
            'from-pink-500 to-rose-500',
            'from-cyan-500 to-blue-500',
            'from-teal-500 to-green-500'
        ];
        const gradient = gradients[ticket.event_id % gradients.length];

        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full max-h-screen overflow-y-auto">
                <!-- Header -->
                <div class="relative h-48 bg-gradient-to-br ${gradient}">
                    <button onclick="document.body.removeChild(this.closest('.fixed'))" 
                            class="absolute top-4 right-4 text-white hover:text-gray-200">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                    
                    <div class="absolute bottom-4 left-6 text-white">
                        <h2 class="text-2xl font-bold mb-1">NFT Ticket</h2>
                        <p class="text-white text-opacity-80">#${ticket.token_id.toString().padStart(4, '0')}</p>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="p-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">${event.title}</h3>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">Event Date</label>
                                <p class="font-medium">${utils.formatDate(event.start_date)}</p>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">Ticket Type</label>
                                <p class="font-medium">${ticket.ticket_type}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">Seat</label>
                                <p class="font-medium">${ticket.seat_info}</p>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">Price</label>
                                <p class="font-medium">${utils.formatPrice(event.ticket_price)}</p>
                            </div>
                        </div>
                        
                        ${event.location ? `
                            <div>
                                <label class="text-sm text-gray-500">Location</label>
                                <p class="font-medium">${event.location}</p>
                            </div>
                        ` : ''}
                        
                        <div>
                            <label class="text-sm text-gray-500">Purchase Date</label>
                            <p class="font-medium">${utils.formatDate(new Date(ticket.purchase_date * 1000))}</p>
                        </div>
                        
                        <div>
                            <label class="text-sm text-gray-500">Contract Address</label>
                            <p class="font-mono text-sm text-gray-600 break-all">${ticket.event_contract}</p>
                        </div>
                        
                        <!-- QR Code for verification -->
                        <div class="text-center py-4">
                            <div class="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                                <i class="fas fa-qrcode text-gray-400 text-4xl"></i>
                            </div>
                            <p class="text-sm text-gray-500">Verification QR Code</p>
                        </div>
                        
                        <!-- Status -->
                        <div class="text-center">
                            ${ticket.is_used ? 
                                '<span class="bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-medium">Ticket Used</span>' :
                                '<span class="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">Valid Ticket</span>'
                            }
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="mt-6 space-y-3">
                        ${!ticket.is_used ? `
                            <button onclick="ticketsManager.transferTicket(${ticket.token_id})" 
                                    class="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors">
                                Transfer Ticket
                            </button>
                        ` : ''}
                        
                        <button onclick="ticketsManager.viewOnBlockchain('${ticket.event_contract}', ${ticket.token_id})" 
                                class="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            View on Blockchain
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Transfer ticket (placeholder)
    async transferTicket(tokenId) {
        showNotification('Ticket transfer feature coming soon!', 'info');
    }

    // View on blockchain explorer (placeholder)
    viewOnBlockchain(contractAddress, tokenId) {
        showNotification('Blockchain explorer integration coming soon!', 'info');
    }

    // Refresh tickets
    async refreshTickets() {
        await this.loadUserTickets();
    }
}

// Initialize tickets manager
const ticketsManager = new TicketsManager();

// Make it globally accessible
window.ticketsManager = ticketsManager;

// Global functions
async function refreshTickets() {
    await ticketsManager.refreshTickets();
}

// Event listeners
eventBus.on('page:changed', (data) => {
    if (data.page === 'my-tickets') {
        setTimeout(() => {
            ticketsManager.loadUserTickets();
        }, 100);
    }
});

eventBus.on('wallet:connected', () => {
    if (app.currentPage === 'my-tickets') {
        ticketsManager.loadUserTickets();
    }
});

eventBus.on('transaction:success', (data) => {
    if (data.type === 'ticket_purchase' && app.currentPage === 'my-tickets') {
        // Refresh tickets after successful purchase
        setTimeout(() => {
            ticketsManager.refreshTickets();
        }, 2000);
    }
});

console.log('Tickets module loaded successfully');