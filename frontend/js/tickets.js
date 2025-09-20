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

    // View ticket details in modal with NFT information
    async viewTicketDetails(tokenId) {
        const ticket = this.tickets.find(t => t.token_id === tokenId);
        const event = this.events.get(ticket.event_id);

        if (!ticket || !event) return;

        // Show loading modal first
        this.showLoadingModal();

        try {
            // Get NFT metadata from blockchain
            const nftMetadata = await this.getNFTMetadata(ticket.event_contract, tokenId);
            const transactionHistory = await this.getNFTTransactionHistory(ticket.event_contract, tokenId);

            this.showTicketDetailsModal(ticket, event, nftMetadata, transactionHistory);
        } catch (error) {
            console.error('Error loading NFT details:', error);
            // Fall back to basic ticket details
            this.showTicketDetailsModal(ticket, event);
        }
    }

    // Get NFT metadata from blockchain
    async getNFTMetadata(contractAddress, tokenId) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/blockchain/nft/${contractAddress}/${tokenId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch NFT metadata');
            }
            const metadata = await response.json();
            return metadata;
        } catch (error) {
            console.error('Error fetching NFT metadata:', error);
            return null;
        }
    }

    // Get NFT transaction history
    async getNFTTransactionHistory(contractAddress, tokenId) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/blockchain/nft/${contractAddress}/${tokenId}/history`);
            if (!response.ok) {
                throw new Error('Failed to fetch transaction history');
            }
            const history = await response.json();
            return history;
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            return null;
        }
    }

    // Show loading modal
    showLoadingModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.id = 'ticket-modal';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-8 text-center">
                <div class="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p class="text-gray-600">Loading NFT details...</p>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Show ticket details modal with NFT information
    showTicketDetailsModal(ticket, event, nftMetadata = null, transactionHistory = null) {
        // Remove loading modal
        const loadingModal = document.getElementById('ticket-modal');
        if (loadingModal) {
            document.body.removeChild(loadingModal);
        }

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

        const isUsed = ticket.is_used || (nftMetadata && nftMetadata.is_used);
        const network = nftMetadata ? nftMetadata.network : 'Unknown';
        const chainId = nftMetadata ? nftMetadata.chain_id : 'Unknown';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
                <!-- Header -->
                <div class="relative h-48 bg-gradient-to-br ${gradient}">
                    <button onclick="document.body.removeChild(this.closest('.fixed'))"
                            class="absolute top-4 right-4 text-white hover:text-gray-200">
                        <i class="fas fa-times text-xl"></i>
                    </button>

                    <div class="absolute bottom-4 left-6 text-white">
                        <h2 class="text-2xl font-bold mb-1">NFT Ticket</h2>
                        <p class="text-white text-opacity-80">#${ticket.token_id.toString().padStart(4, '0')}</p>
                        ${nftMetadata ? `
                            <div class="flex items-center mt-2">
                                <i class="fas fa-${ticketsManager.getNetworkInfo(nftMetadata.network).icon} mr-2"></i>
                                <span class="text-white text-opacity-90 text-sm">${ticketsManager.getNetworkInfo(nftMetadata.network).name}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Content -->
                <div class="p-6">
                    <div class="grid md:grid-cols-2 gap-6">
                        <!-- Left Column - Ticket Details -->
                        <div>
                            <h3 class="text-xl font-bold text-gray-900 mb-4">${event.title}</h3>

                            <div class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="text-sm text-gray-500">Event Date</label>
                                        <p class="font-medium">${utils.formatDate(event.start_date)}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm text-gray-500">Ticket Type</label>
                                        <p class="font-medium">${ticket.ticket_type || (nftMetadata ? nftMetadata.ticket_type : 'Standard')}</p>
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
                                    <div class="flex items-center space-x-2">
                                        <p class="font-mono text-sm text-gray-600 break-all flex-1">${ticket.event_contract}</p>
                                        <button onclick="ticketsManager.copyToClipboard('${ticket.event_contract}', 'Contract address')"
                                                class="text-primary-600 hover:text-primary-700 p-1">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="text-sm text-gray-500">Token ID</label>
                                    <div class="flex items-center space-x-2">
                                        <p class="font-mono text-sm text-gray-600">${ticket.token_id}</p>
                                        <button onclick="ticketsManager.copyToClipboard('${ticket.token_id}', 'Token ID')"
                                                class="text-primary-600 hover:text-primary-700 p-1">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                    </div>
                                </div>

                                ${nftMetadata ? `
                                    <div>
                                        <label class="text-sm text-gray-500">Owner</label>
                                        <p class="font-mono text-sm text-gray-600 break-all">${nftMetadata.owner}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Right Column - NFT Information -->
                        <div>
                            <h4 class="text-lg font-bold text-gray-900 mb-4">NFT Information</h4>

                            ${nftMetadata ? `
                                <div class="space-y-4">
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-gray-900 mb-2">Blockchain Details</h5>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex justify-between items-center">
                                                <span class="text-gray-500">Network:</span>
                                                <div class="flex items-center">
                                                    <i class="fas fa-${ticketsManager.getNetworkInfo(network).icon} ${ticketsManager.getNetworkInfo(network).color} mr-1"></i>
                                                    <span class="font-medium">${ticketsManager.getNetworkInfo(network).name}</span>
                                                </div>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-500">Chain ID:</span>
                                                <span class="font-medium">${chainId}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-500">Token URI:</span>
                                                <span class="font-mono text-xs text-gray-600 truncate max-w-32">${nftMetadata.token_uri}</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-gray-500">Ownership:</span>
                                                <button onclick="ticketsManager.verifyOwnership('${ticket.event_contract}', ${ticket.token_id})"
                                                        class="text-primary-600 hover:text-primary-700 text-xs underline">
                                                    Verify
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    ${transactionHistory && transactionHistory.transactions ? `
                                        <div class="bg-gray-50 p-4 rounded-lg">
                                            <h5 class="font-medium text-gray-900 mb-2">Transaction History</h5>
                                            <div class="space-y-2 max-h-32 overflow-y-auto">
                                                ${transactionHistory.transactions.slice(0, 3).map(tx => `
                                                    <div class="text-xs bg-white p-2 rounded border">
                                                        <div class="flex justify-between">
                                                            <span class="text-gray-500">Block:</span>
                                                            <span class="font-mono">${tx.block_number}</span>
                                                        </div>
                                                        <div class="flex justify-between">
                                                            <span class="text-gray-500">From:</span>
                                                            <span class="font-mono text-xs">${tx.from_address.slice(0, 6)}...${tx.from_address.slice(-4)}</span>
                                                        </div>
                                                        <div class="flex justify-between">
                                                            <span class="text-gray-500">To:</span>
                                                            <span class="font-mono text-xs">${tx.to_address.slice(0, 6)}...${tx.to_address.slice(-4)}</span>
                                                        </div>
                                                        <div class="text-center mt-1">
                                                            <a href="${tx.explorer_url}" target="_blank"
                                                               class="text-primary-600 hover:text-primary-700 text-xs">
                                                                View on Explorer →
                                                            </a>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : `
                                <div class="bg-yellow-50 p-4 rounded-lg">
                                    <div class="flex items-center">
                                        <i class="fas fa-info-circle text-yellow-500 mr-2"></i>
                                        <span class="text-yellow-700 text-sm">NFT details not available</span>
                                    </div>
                                    <p class="text-yellow-600 text-xs mt-1">Connect to blockchain to view NFT information</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- QR Code and Status -->
                    <div class="mt-6 grid md:grid-cols-2 gap-6">
                        <div class="text-center">
                            <div class="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                                <i class="fas fa-qrcode text-gray-400 text-4xl"></i>
                            </div>
                            <p class="text-sm text-gray-500">Verification QR Code</p>
                        </div>

                        <div class="text-center flex items-center justify-center">
                            ${isUsed ?
                                '<span class="bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-medium">Ticket Used</span>' :
                                '<span class="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">Valid Ticket</span>'
                            }
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="mt-6 space-y-3">
                        <div class="grid md:grid-cols-2 gap-3">
                            ${!isUsed ? `
                                <button onclick="ticketsManager.transferTicket(${ticket.token_id})"
                                        class="bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors">
                                    Transfer Ticket
                                </button>
                            ` : '<div></div>'}

                            <button onclick="ticketsManager.viewOnBlockchain('${ticket.event_contract}', ${ticket.token_id})"
                                    class="border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                View on Blockchain
                            </button>
                        </div>

                        ${nftMetadata && nftMetadata.explorer_url ? `
                            <button onclick="window.open('${nftMetadata.explorer_url}', '_blank')"
                                    class="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition-colors">
                                <i class="fas fa-external-link-alt mr-2"></i>
                                Open in Blockchain Explorer
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Transfer ticket with actual blockchain functionality
    async transferTicket(tokenId) {
        const ticket = this.tickets.find(t => t.token_id === tokenId);
        const event = this.events.get(ticket.event_id);

        if (!ticket || !event) {
            showNotification('Ticket not found', 'error');
            return;
        }

        // Check if wallet is connected
        if (!state.wallet.connected) {
            showNotification('Please connect your wallet to transfer tickets', 'error');
            return;
        }

        // Check if ticket is used
        if (ticket.is_used) {
            showNotification('Cannot transfer a used ticket', 'error');
            return;
        }

        // Show transfer modal
        this.showTransferModal(ticket, event);
    }

    // Show transfer modal
    showTransferModal(ticket, event) {
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
            <div class="bg-white rounded-2xl max-w-md w-full">
                <!-- Header -->
                <div class="relative h-32 bg-gradient-to-br ${gradient}">
                    <button onclick="document.body.removeChild(this.closest('.fixed'))"
                            class="absolute top-4 right-4 text-white hover:text-gray-200">
                        <i class="fas fa-times text-xl"></i>
                    </button>

                    <div class="absolute bottom-4 left-6 text-white">
                        <h2 class="text-xl font-bold">Transfer NFT Ticket</h2>
                        <p class="text-white text-opacity-80">#${ticket.token_id.toString().padStart(4, '0')}</p>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">${event.title}</h3>
                        <p class="text-sm text-gray-600">Transfer this ticket to another wallet address</p>
                    </div>

                    <!-- Transfer Form -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Recipient Wallet Address
                            </label>
                            <input type="text"
                                   id="transfer-recipient"
                                   placeholder="0x..."
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                   maxlength="42">
                            <p class="text-xs text-gray-500 mt-1">Enter a valid Ethereum address</p>
                        </div>

                        <!-- Network Warning -->
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div class="flex items-start">
                                <i class="fas fa-exclamation-triangle text-yellow-500 mt-0.5 mr-2"></i>
                                <div class="text-sm">
                                    <p class="font-medium text-yellow-800">Network Check Required</p>
                                    <p class="text-yellow-700">Ensure the recipient's wallet is on the same network as this NFT</p>
                                </div>
                            </div>
                        </div>

                        <!-- Gas Fee Estimate -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <i class="fas fa-gas-pump text-blue-500 mr-2"></i>
                                    <span class="text-sm font-medium text-blue-800">Estimated Gas Fee</span>
                                </div>
                                <span class="text-sm text-blue-700" id="gas-estimate">~0.001 ETH</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="mt-6 space-y-3">
                        <button onclick="ticketsManager.confirmTransfer(${ticket.token_id}, '${ticket.event_contract}')"
                                class="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium">
                            <i class="fas fa-paper-plane mr-2"></i>
                            Transfer Ticket
                        </button>

                        <button onclick="document.body.removeChild(this.closest('.fixed'))"
                                class="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Update gas estimate
        setTimeout(() => {
            this.updateGasEstimate(ticket.token_id, ticket.event_contract);
        }, 100);

        // Focus on input field
        setTimeout(() => {
            const input = document.getElementById('transfer-recipient');
            if (input) input.focus();
        }, 100);
    }

    // Confirm and execute transfer
    async confirmTransfer(tokenId, contractAddress) {
        const recipientInput = document.getElementById('transfer-recipient');
        const recipientAddress = recipientInput?.value?.trim();

        if (!recipientAddress) {
            showNotification('Please enter a recipient address', 'error');
            return;
        }

        // Basic address validation
        if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
            showNotification('Please enter a valid Ethereum address', 'error');
            return;
        }

        // Check if recipient is the same as current owner
        if (recipientAddress.toLowerCase() === state.wallet.address.toLowerCase()) {
            showNotification('Cannot transfer to your own address', 'error');
            return;
        }

        const ticket = this.tickets.find(t => t.token_id === tokenId);
        if (!ticket) {
            showNotification('Ticket not found', 'error');
            return;
        }

        // Show confirmation dialog
        if (!confirm(`Are you sure you want to transfer this NFT ticket to ${recipientAddress}? This action cannot be undone.`)) {
            return;
        }

        try {
            showLoading(true);
            showNotification('Submitting transfer transaction...', 'info');

            // Call transfer API
            const response = await fetch(`${config.API_BASE_URL}/blockchain/tickets/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...auth.getAuthHeaders()
                },
                body: JSON.stringify({
                    from_address: state.wallet.address,
                    to_address: recipientAddress,
                    token_id: tokenId
                })
            });

            const result = await response.json();

            if (response.ok) {
                showNotification('Transfer transaction submitted! Check your wallet for confirmation.', 'success');

                // Start monitoring the transaction
                if (result.transaction_hash) {
                    this.monitorTransaction(result.transaction_hash, 'NFT Transfer');
                }

                // Close modal
                const modal = document.querySelector('.fixed');
                if (modal) document.body.removeChild(modal);

                // Refresh tickets after a delay
                setTimeout(() => {
                    this.refreshTickets();
                }, 5000); // Longer delay for blockchain confirmation

            } else {
                throw new Error(result.error || 'Transfer failed');
            }

        } catch (error) {
            console.error('Transfer error:', error);
            showNotification(`Transfer failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    // View on blockchain explorer with dynamic network detection
    async viewOnBlockchain(contractAddress, tokenId) {
        try {
            showLoading(true);

            // First try to get NFT metadata to determine the network
            let network = 'mainnet'; // default
            let explorerUrl = null;

            try {
                const metadataResponse = await fetch(`${config.API_BASE_URL}/blockchain/nft/${contractAddress}/${tokenId}`);
                if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    if (metadata.network) {
                        network = metadata.network;
                    }
                    if (metadata.explorer_url) {
                        explorerUrl = metadata.explorer_url;
                    }
                }
            } catch (error) {
                console.warn('Could not fetch NFT metadata for network detection:', error);
            }

            // If we have an explorer URL from metadata, use it
            if (explorerUrl) {
                window.open(explorerUrl, '_blank');
                showNotification('Opened blockchain explorer', 'success');
                return;
            }

            // Otherwise, construct URL based on network
            const explorerUrls = {
                'mainnet': 'https://etherscan.io',
                'polygon': 'https://polygonscan.com',
                'mumbai': 'https://mumbai.polygonscan.com',
                'sepolia': 'https://sepolia.etherscan.io',
                'localhost': 'http://localhost:8545' // For local development
            };

            const baseUrl = explorerUrls[network] || explorerUrls['mainnet'];

            // For localhost, we can't open a real explorer, so show a message
            if (network === 'localhost') {
                showNotification('This NFT is on localhost network - no public explorer available', 'info');
                return;
            }

            // Construct the token-specific URL
            const tokenUrl = `${baseUrl}/token/${contractAddress}?a=${tokenId}`;

            // Try to open the URL
            window.open(tokenUrl, '_blank');
            showNotification(`Opened ${network} blockchain explorer`, 'success');

        } catch (error) {
            console.error('Error opening blockchain explorer:', error);

            // Fallback: try to construct a basic explorer URL
            try {
                const fallbackUrl = `https://etherscan.io/token/${contractAddress}?a=${tokenId}`;
                window.open(fallbackUrl, '_blank');
                showNotification('Opened Etherscan (fallback)', 'success');
            } catch (fallbackError) {
                showNotification('Unable to open blockchain explorer', 'error');
            }
        } finally {
            showLoading(false);
        }
    }

    // Add utility methods for NFT interactions
    copyToClipboard(text, label = 'text') {
        navigator.clipboard.writeText(text).then(() => {
            showNotification(`${label} copied to clipboard`, 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification(`${label} copied to clipboard`, 'success');
        });
    }

    // Verify NFT ownership on blockchain
    async verifyOwnership(contractAddress, tokenId) {
        try {
            showLoading(true);

            const metadata = await this.getNFTMetadata(contractAddress, tokenId);

            if (metadata && metadata.owner) {
                const isOwner = metadata.owner.toLowerCase() === state.wallet.address.toLowerCase();

                if (isOwner) {
                    showNotification('✓ Ownership verified - you own this NFT', 'success');
                } else {
                    showNotification('✗ You do not own this NFT', 'warning');
                }

                return isOwner;
            } else {
                showNotification('Unable to verify ownership - blockchain connection may be offline', 'warning');
                return false;
            }

        } catch (error) {
            console.error('Error verifying ownership:', error);
            showNotification('Error verifying ownership', 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Get network information for display
    getNetworkInfo(network) {
        const networks = {
            'mainnet': {
                name: 'Ethereum Mainnet',
                icon: 'fab fa-ethereum',
                color: 'text-blue-600'
            },
            'polygon': {
                name: 'Polygon',
                icon: 'fas fa-hexagon-nodes',
                color: 'text-purple-600'
            },
            'mumbai': {
                name: 'Polygon Mumbai',
                icon: 'fas fa-hexagon-nodes',
                color: 'text-orange-600'
            },
            'sepolia': {
                name: 'Ethereum Sepolia',
                icon: 'fab fa-ethereum',
                color: 'text-gray-600'
            },
            'localhost': {
                name: 'Local Network',
                icon: 'fas fa-server',
                color: 'text-green-600'
            }
        };

        return networks[network] || networks['mainnet'];
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

// Gas estimation methods
ticketsManager.estimateTransferGas = async function(tokenId, contractAddress, recipientAddress) {
    try {
        // This is a simplified estimation - in a real app you'd call the blockchain
        // For now, we'll use a reasonable estimate based on typical ERC-721 transfer costs

        const baseGasEstimate = 65000; // Base gas for ERC-721 transfer
        const gasPrice = 20000000000; // 20 gwei in wei

        const gasCostWei = baseGasEstimate * gasPrice;
        const gasCostEth = gasCostWei / 1000000000000000000; // Convert to ETH

        return {
            gasLimit: baseGasEstimate,
            gasPrice: gasPrice,
            estimatedCost: gasCostEth,
            formattedCost: `~${gasCostEth.toFixed(4)} ETH`
        };
    } catch (error) {
        console.error('Error estimating gas:', error);
        return {
            gasLimit: 65000,
            gasPrice: 20000000000,
            estimatedCost: 0.001,
            formattedCost: '~0.001 ETH'
        };
    }
};

ticketsManager.updateGasEstimate = async function(tokenId, contractAddress) {
    const gasElement = document.getElementById('gas-estimate');
    if (!gasElement) return;

    try {
        const estimate = await this.estimateTransferGas(tokenId, contractAddress, '0x0000000000000000000000000000000000000000');
        gasElement.textContent = estimate.formattedCost;
    } catch (error) {
        gasElement.textContent = '~0.001 ETH';
    }
};

// Transaction monitoring methods
ticketsManager.monitorTransaction = async function(txHash, description = 'Transaction') {
    try {
        showNotification(`${description} submitted. Monitoring status...`, 'info');

        // Show transaction details modal
        this.showTransactionModal(txHash, description);

        // Poll for transaction status
        const checkStatus = async () => {
            try {
                const response = await fetch(`${config.API_BASE_URL}/blockchain/transactions/${txHash}`);
                if (response.ok) {
                    const data = await response.json();

                    // Update modal with current status
                    this.updateTransactionModal(txHash, data);

                    if (data.status === 'confirmed') {
                        showNotification(`${description} confirmed!`, 'success');
                        this.refreshTickets(); // Refresh tickets when confirmed
                        return;
                    } else if (data.status === 'failed') {
                        showNotification(`${description} failed`, 'error');
                        return;
                    }
                }

                // Continue polling if not confirmed yet
                setTimeout(checkStatus, 3000); // Check every 3 seconds

            } catch (error) {
                console.error('Error checking transaction status:', error);
                setTimeout(checkStatus, 5000); // Retry after 5 seconds on error
            }
        };

        // Start monitoring
        setTimeout(checkStatus, 2000); // Initial delay

    } catch (error) {
        console.error('Error monitoring transaction:', error);
    }
};

ticketsManager.showTransactionModal = function(txHash, description) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.id = `tx-modal-${txHash}`;

    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">${description}</h3>
                    <button onclick="document.body.removeChild(this.closest('.fixed'))"
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <div class="animate-spin w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                        <div>
                            <p class="font-medium text-gray-900">Transaction Pending</p>
                            <p class="text-sm text-gray-600">Waiting for confirmation...</p>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-xs text-gray-500 mb-1">Transaction Hash</p>
                        <p class="font-mono text-sm text-gray-800 break-all">${txHash}</p>
                    </div>

                    <div class="text-center">
                        <p class="text-sm text-gray-600">This may take a few minutes</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

ticketsManager.updateTransactionModal = function(txHash, data) {
    const modal = document.getElementById(`tx-modal-${txHash}`);
    if (!modal) return;

    const statusDiv = modal.querySelector('.flex.items-center.space-x-3');
    const statusText = statusDiv.querySelector('p.font-medium');
    const subText = statusDiv.querySelector('p.text-sm');

    if (data.status === 'confirmed') {
        statusDiv.innerHTML = `
            <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <i class="fas fa-check text-white text-xs"></i>
            </div>
            <div>
                <p class="font-medium text-green-600">Transaction Confirmed</p>
                <p class="text-sm text-gray-600">Block #${data.block_number || 'N/A'}</p>
            </div>
        `;

        // Auto-close modal after 3 seconds
        setTimeout(() => {
            if (modal && modal.parentNode) {
                document.body.removeChild(modal);
            }
        }, 3000);

    } else if (data.status === 'failed') {
        statusDiv.innerHTML = `
            <div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <i class="fas fa-times text-white text-xs"></i>
            </div>
            <div>
                <p class="font-medium text-red-600">Transaction Failed</p>
                <p class="text-sm text-gray-600">Please try again</p>
            </div>
        `;
    }
};