// Page loader utility for loading separate HTML files
class PageLoader {
    constructor() {
        this.cache = new Map();
        this.basePath = 'pages/';
    }

    async loadPage(pageName) {
        // Check cache first
        if (this.cache.has(pageName)) {
            console.log(`Loading ${pageName} from cache`);
            return this.cache.get(pageName);
        }

        try {
            console.log(`Fetching page: ${this.basePath}${pageName}.html`);
            const response = await fetch(`${this.basePath}${pageName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to load page ${pageName}`);
            }
            
            const html = await response.text();
            console.log(`Successfully fetched ${pageName}, length: ${html.length}`);
            
            // Extract body content from the loaded HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const bodyContent = doc.body.innerHTML;
            
            // Cache the content
            this.cache.set(pageName, bodyContent);
            console.log(`Cached ${pageName} page content`);
            
            return bodyContent;
        } catch (error) {
            console.error(`Error loading page ${pageName}:`, error);
            return `<div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Page Load Error</h3>
                <p class="text-gray-600">Failed to load ${pageName} page: ${error.message}</p>
            </div>`;
        }
    }

    clearCache() {
        this.cache.clear();
    }

    preloadPages(pageNames) {
        // Preload pages in the background
        pageNames.forEach(pageName => {
            this.loadPage(pageName).catch(error => {
                console.warn(`Failed to preload page ${pageName}:`, error);
            });
        });
    }
}

// Create global instance
const pageLoader = new PageLoader();