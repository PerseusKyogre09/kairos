// Utility functions for the application
const utils = {
    // Format date for display
    formatDate(date) {
        if (!date) return 'N/A';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format price in ETH
    formatPrice(price) {
        if (price === null || price === undefined) return 'Free';
        
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return 'N/A';
        
        if (numPrice === 0) return 'Free';
        
        return `${numPrice.toFixed(4)} ETH`;
    },

    // Format wallet address (show first 6 and last 4 characters)
    formatAddress(address) {
        if (!address) return 'N/A';
        if (address.length < 10) return address;
        
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('Copied to clipboard!', 'success');
            return true;
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification('Copied to clipboard!', 'success');
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                showNotification('Failed to copy to clipboard', 'error');
                return false;
            }
        }
    },

    // Debounce function for search inputs
    debounce(func, wait) {
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

    // Truncate text with ellipsis
    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    },

    // Generate random color for avatars/placeholders
    generateColor(seed) {
        const colors = [
            '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
            '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
        ];
        
        if (!seed) return colors[0];
        
        // Simple hash function for consistent colors
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate Ethereum address format
    isValidEthereumAddress(address) {
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        return ethAddressRegex.test(address);
    },

    // Generate QR code data URL (placeholder - would need QR library in real implementation)
    generateQRCode(data) {
        // This is a placeholder - in a real implementation you'd use a QR code library
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="#f0f0f0"/>
                <text x="50" y="50" text-anchor="middle" dy=".3em" font-family="monospace" font-size="8">QR</text>
            </svg>
        `)}`;
    },

    // Format time ago (e.g., "2 hours ago")
    timeAgo(date) {
        if (!date) return 'Unknown';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffInSeconds = Math.floor((now - dateObj) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        
        return this.formatDate(dateObj);
    },

    // Capitalize first letter
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Check if date is in the future
    isFutureDate(date) {
        if (!date) return false;
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj > new Date();
    },

    // Check if date is today
    isToday(date) {
        if (!date) return false;
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        
        return dateObj.getDate() === today.getDate() &&
               dateObj.getMonth() === today.getMonth() &&
               dateObj.getFullYear() === today.getFullYear();
    },

    // Format duration (e.g., "2h 30m")
    formatDuration(startDate, endDate) {
        if (!startDate || !endDate) return 'N/A';
        
        const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
        const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
        
        const diffInMinutes = Math.floor((end - start) / (1000 * 60));
        
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        
        const hours = Math.floor(diffInMinutes / 60);
        const minutes = diffInMinutes % 60;
        
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
};

console.log('Utils module loaded successfully');