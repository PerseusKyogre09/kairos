// Wallet integration module with MetaMask support
class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.connected = false;
        
        // Load saved wallet address
        this.address = localStorage.getItem(CONFIG.STORAGE_KEYS.WALLET_ADDRESS);
        if (this.address) {
            this.connected = true;
            state.wallet.connected = true;
            state.wallet.address = this.address;
        }
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
            window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
            window.ethereum.on('disconnect', this.handleDisconnect.bind(this));
        }
    }

    // Check if MetaMask is installed
    isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    // Connect to MetaMask wallet
    async connectWallet() {
        try {
            if (!this.isMetaMaskInstalled()) {
                showNotification('MetaMask is not installed. Please install MetaMask to continue.', 'error');
                window.open('https://metamask.io/download/', '_blank');
                return false;
            }

            showLoading(true);

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }

            this.address = accounts[0];
            this.connected = true;
            
            // Update global state
            state.wallet.connected = true;
            state.wallet.address = this.address;
            state.wallet.provider = window.ethereum;

            // Save to localStorage
            localStorage.setItem(CONFIG.STORAGE_KEYS.WALLET_ADDRESS, this.address);

            // Update UI
            this.updateWalletUI();

            // Emit event
            eventBus.emit('wallet:connected', {
                address: this.address,
                provider: window.ethereum
            });

            showNotification(`MetaMask connected! Address ${utils.formatAddress(this.address)} will be used for transactions.`, 'success');
            
            // If user is authenticated, update and verify their wallet address
            if (auth.isAuthenticated()) {
                await this.updateUserWalletAddress();
                // Automatically verify the wallet ownership
                setTimeout(() => {
                    this.verifyWalletOwnership();
                }, 1000);
            }

            return true;
        } catch (error) {
            console.error('Wallet connection error:', error);
            
            if (error.code === 4001) {
                showNotification('Wallet connection rejected by user', 'error');
            } else {
                showNotification('Failed to connect wallet: ' + error.message, 'error');
            }
            
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Disconnect wallet
    async disconnectWallet() {
        try {
            this.address = null;
            this.connected = false;
            this.provider = null;
            this.signer = null;

            // Update global state
            state.wallet.connected = false;
            state.wallet.address = null;
            state.wallet.provider = null;

            // Clear localStorage
            localStorage.removeItem(CONFIG.STORAGE_KEYS.WALLET_ADDRESS);

            // Update UI
            this.updateWalletUI();

            // Emit event
            eventBus.emit('wallet:disconnected');

            showNotification('Wallet disconnected', 'success');
        } catch (error) {
            console.error('Wallet disconnection error:', error);
            showNotification('Error disconnecting wallet', 'error');
        }
    }

    // Get wallet balance
    async getBalance() {
        try {
            if (!this.connected || !this.address) {
                throw new Error('Wallet not connected');
            }

            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [this.address, 'latest']
            });

            // Convert from wei to ether
            const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
            return balanceInEth;
        } catch (error) {
            console.error('Get balance error:', error);
            return 0;
        }
    }

    // Sign message for wallet verification
    async signMessage(message) {
        try {
            if (!this.connected || !this.address) {
                throw new Error('Wallet not connected');
            }

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.address]
            });

            return signature;
        } catch (error) {
            console.error('Sign message error:', error);
            
            if (error.code === 4001) {
                showNotification('Message signing rejected by user', 'error');
            } else {
                showNotification('Failed to sign message: ' + error.message, 'error');
            }
            
            throw error;
        }
    }

    // Send transaction
    async sendTransaction(to, value, data = '0x') {
        try {
            if (!this.connected || !this.address) {
                throw new Error('Wallet not connected');
            }

            const transactionParameters = {
                to: to,
                from: this.address,
                value: value,
                data: data
            };

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters]
            });

            return txHash;
        } catch (error) {
            console.error('Send transaction error:', error);
            
            if (error.code === 4001) {
                showNotification('Transaction rejected by user', 'error');
            } else {
                showNotification('Transaction failed: ' + error.message, 'error');
            }
            
            throw error;
        }
    }

    // Switch to correct network
    async switchNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CONFIG.WALLET.CHAIN_ID }]
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: CONFIG.WALLET.CHAIN_ID,
                            chainName: CONFIG.WALLET.CHAIN_NAME,
                            rpcUrls: [CONFIG.WALLET.RPC_URL],
                            nativeCurrency: CONFIG.WALLET.CURRENCY
                        }]
                    });
                } catch (addError) {
                    console.error('Add network error:', addError);
                    throw addError;
                }
            } else {
                throw switchError;
            }
        }
    }

    // Update user's wallet address in backend
    async updateUserWalletAddress() {
        try {
            if (!auth.isAuthenticated() || !this.address) {
                return;
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.PROFILES.WALLET}`, {
                method: 'PUT',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({
                    wallet_address: this.address
                })
            });

            if (response.ok) {
                console.log('Wallet address updated in backend');
                // Update the user's profile in the global state
                if (state.user) {
                    state.user.wallet_address = this.address;
                }
            } else {
                console.error('Failed to update wallet address in backend');
            }
        } catch (error) {
            console.error('Update wallet address error:', error);
        }
    }

    // Verify wallet ownership
    async verifyWalletOwnership() {
        try {
            if (!auth.isAuthenticated() || !this.connected) {
                throw new Error('User not authenticated or wallet not connected');
            }

            showLoading(true);

            // Get verification message from backend
            const messageResponse = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.PROFILES.VERIFY_WALLET}`, {
                method: 'POST',
                headers: auth.getAuthHeaders()
            });

            if (!messageResponse.ok) {
                throw new Error('Failed to get verification message');
            }

            const messageData = await messageResponse.json();
            const message = messageData.message;

            // Sign the message
            const signature = await this.signMessage(message);

            // Send signature to backend for verification
            const verifyResponse = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.PROFILES.WALLET}`, {
                method: 'PUT',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({
                    wallet_address: this.address,
                    signature: signature,
                    message: message
                })
            });

            if (verifyResponse.ok) {
                showNotification('Wallet ownership verified successfully!', 'success');
                eventBus.emit('wallet:verified', { address: this.address });
                return true;
            } else {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.error || 'Verification failed');
            }
        } catch (error) {
            console.error('Wallet verification error:', error);
            showNotification('Wallet verification failed: ' + error.message, 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Handle account changes
    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // User disconnected wallet
            this.disconnectWallet();
        } else if (accounts[0] !== this.address) {
            // User switched accounts
            this.address = accounts[0];
            state.wallet.address = this.address;
            localStorage.setItem(CONFIG.STORAGE_KEYS.WALLET_ADDRESS, this.address);
            
            this.updateWalletUI();
            eventBus.emit('wallet:accountChanged', { address: this.address });
            
            showNotification('Wallet account changed', 'info');
            
            // Update backend if user is authenticated
            if (auth.isAuthenticated()) {
                this.updateUserWalletAddress();
            }
        }
    }

    // Handle chain changes
    handleChainChanged(chainId) {
        console.log('Chain changed to:', chainId);
        eventBus.emit('wallet:chainChanged', { chainId });
        
        // Reload page to reset state
        window.location.reload();
    }

    // Handle disconnect
    handleDisconnect(error) {
        console.log('Wallet disconnected:', error);
        this.disconnectWallet();
    }

    // Update wallet UI
    updateWalletUI() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const walletConnected = document.getElementById('wallet-connected');
        const walletAddress = document.getElementById('wallet-address');

        if (this.connected && this.address) {
            connectBtn.classList.add('hidden');
            walletConnected.classList.remove('hidden');
            walletAddress.textContent = utils.formatAddress(this.address);
            walletAddress.title = this.address; // Show full address on hover
        } else {
            connectBtn.classList.remove('hidden');
            walletConnected.classList.add('hidden');
        }
    }
}

// Initialize wallet manager
const wallet = new WalletManager();

// Wallet event listeners
eventBus.on('wallet:connected', (data) => {
    console.log('Wallet connected:', data.address);
});

eventBus.on('wallet:disconnected', () => {
    console.log('Wallet disconnected');
});

eventBus.on('wallet:verified', (data) => {
    console.log('Wallet verified:', data.address);
});

// Global wallet functions
async function connectWallet() {
    return await wallet.connectWallet();
}

async function disconnectWallet() {
    return await wallet.disconnectWallet();
}

async function verifyWallet() {
    return await wallet.verifyWalletOwnership();
}

async function getWalletBalance() {
    return await wallet.getBalance();
}

// Copy wallet address to clipboard
function copyWalletAddress() {
    if (wallet.address) {
        utils.copyToClipboard(wallet.address);
    }
}

// Initialize wallet UI on page load
document.addEventListener('DOMContentLoaded', () => {
    wallet.updateWalletUI();
});

console.log('Wallet module loaded successfully');