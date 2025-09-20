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
            login: () => this.renderLoginPage(),
            register: () => this.renderRegisterPage(),
            events: () => this.renderEventsPage(),
            'create-event': () => this.renderCreateEventPage(),
            profile: () => this.renderProfilePage(),
            'my-events': () => this.renderMyEventsPage()
        };
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
            const page = event.state?.page || 'home';
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
            const url = pageName === 'home' ? '/' : `#${pageName}`;
            history.pushState({ page: pageName }, '', url);
        }

        this.currentPage = pageName;
        
        // Emit page change event
        eventBus.emit('page:changed', { page: pageName });
    }

    updateNavigation(activePage) {
        // Update navigation active states
        document.querySelectorAll('.nav-link').forEach(link => {
            const onclick = link.getAttribute('onclick');
            if (onclick && onclick.includes(activePage)) {
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

    // Page renderers
    renderHomePage() {
        // Home page is static, no dynamic content needed
    }

    renderLoginPage() {
        const pageElement = document.getElementById('login-page');
        pageElement.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div>
                        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
                            <i class="fas fa-cube text-primary-600 text-2xl"></i>
                        </div>
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Sign in to your account
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            Or
                            <a href="#" onclick="showPage('register')" class="font-medium text-primary-600 hover:text-primary-500">
                                create a new account
                            </a>
                        </p>
                    </div>
                    <form class="mt-8 space-y-6" data-action="login">
                        <div class="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label for="username" class="sr-only">Username</label>
                                <input id="username" name="username" type="text" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" 
                                       placeholder="Username">
                            </div>
                            <div>
                                <label for="password" class="sr-only">Password</label>
                                <input id="password" name="password" type="password" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" 
                                       placeholder="Password">
                            </div>
                        </div>

                        <div>
                            <button type="submit" 
                                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white btn-gradient hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                    <i class="fas fa-lock text-primary-300 group-hover:text-primary-200"></i>
                                </span>
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderRegisterPage() {
        const pageElement = document.getElementById('register-page');
        pageElement.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div>
                        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
                            <i class="fas fa-cube text-primary-600 text-2xl"></i>
                        </div>
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Create your account
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            Or
                            <a href="#" onclick="showPage('login')" class="font-medium text-primary-600 hover:text-primary-500">
                                sign in to existing account
                            </a>
                        </p>
                    </div>
                    <form class="mt-8 space-y-6" data-action="register">
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="first_name" class="block text-sm font-medium text-gray-700">First Name</label>
                                    <input id="first_name" name="first_name" type="text" 
                                           class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                           placeholder="First Name">
                                </div>
                                <div>
                                    <label for="last_name" class="block text-sm font-medium text-gray-700">Last Name</label>
                                    <input id="last_name" name="last_name" type="text" 
                                           class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                           placeholder="Last Name">
                                </div>
                            </div>
                            <div>
                                <label for="reg_username" class="block text-sm font-medium text-gray-700">Username *</label>
                                <input id="reg_username" name="username" type="text" required 
                                       class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                       placeholder="Username">
                            </div>
                            <div>
                                <label for="email" class="block text-sm font-medium text-gray-700">Email *</label>
                                <input id="email" name="email" type="email" required 
                                       class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                       placeholder="Email address">
                            </div>
                            <div>
                                <label for="reg_password" class="block text-sm font-medium text-gray-700">Password *</label>
                                <input id="reg_password" name="password" type="password" required 
                                       class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                       placeholder="Password (min 6 characters)">
                            </div>
                            <div>
                                <label for="confirm_password" class="block text-sm font-medium text-gray-700">Confirm Password *</label>
                                <input id="confirm_password" name="confirm_password" type="password" required 
                                       class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                       placeholder="Confirm Password">
                            </div>
                        </div>

                        <div>
                            <button type="submit" 
                                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white btn-gradient hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                    <i class="fas fa-user-plus text-primary-300 group-hover:text-primary-200"></i>
                                </span>
                                Create Account
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderEventsPage() {
        const pageElement = document.getElementById('events-page');
        pageElement.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-4">Discover Events</h1>
                    <p class="text-gray-600">Find and join amazing blockchain events</p>
                </div>

                <!-- Search and Filters -->
                <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <div class="flex flex-col md:flex-row gap-4">
                        <div class="flex-1">
                            <input type="text" id="event-search" placeholder="Search events..." 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        </div>
                        <div class="flex gap-2">
                            <select id="event-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <option value="">All Events</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="past">Past</option>
                            </select>
                            <button onclick="loadEvents()" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Events Grid -->
                <div id="events-grid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Events will be loaded here -->
                </div>

                <!-- Loading State -->
                <div id="events-loading" class="text-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Loading events...</p>
                </div>

                <!-- Empty State -->
                <div id="events-empty" class="hidden text-center py-12">
                    <i class="fas fa-calendar-times text-gray-400 text-6xl mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
                    <p class="text-gray-600 mb-4">Try adjusting your search criteria</p>
                    <button onclick="showPage('create-event')" class="btn-gradient text-white px-6 py-2 rounded-lg">
                        Create Event
                    </button>
                </div>
            </div>
        `;
        
        // Load events
        this.loadEvents();
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

    renderCreateEventPage() {
        if (!auth.isAuthenticated()) {
            showNotification('Please login to create events', 'error');
            this.showPage('login');
            return;
        }

        const pageElement = document.getElementById('create-event-page');
        pageElement.innerHTML = `
            <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-4">Create New Event</h1>
                    <p class="text-gray-600">Create and manage your blockchain event</p>
                </div>

                <form data-action="create-event" class="bg-white rounded-lg shadow-sm p-6 space-y-6">
                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                        <input type="text" id="title" name="title" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                               placeholder="Enter event title">
                    </div>

                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <textarea id="description" name="description" rows="4" required 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                  placeholder="Describe your event"></textarea>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label for="start_date" class="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                            <input type="datetime-local" id="start_date" name="start_date" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        </div>
                        <div>
                            <label for="end_date" class="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                            <input type="datetime-local" id="end_date" name="end_date" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        </div>
                    </div>

                    <div>
                        <label for="location" class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input type="text" id="location" name="location" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                               placeholder="Event location or 'Virtual'">
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label for="ticket_price" class="block text-sm font-medium text-gray-700 mb-2">Ticket Price (ETH) *</label>
                            <input type="number" id="ticket_price" name="ticket_price" step="0.001" min="0" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                   placeholder="0.05">
                        </div>
                        <div>
                            <label for="capacity" class="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
                            <input type="number" id="capacity" name="capacity" min="1" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                   placeholder="100">
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="showPage('events')" 
                                class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-6 py-2 btn-gradient text-white rounded-lg hover:bg-primary-700">
                            Create Event
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    renderProfilePage() {
        if (!auth.isAuthenticated()) {
            showNotification('Please login to view profile', 'error');
            this.showPage('login');
            return;
        }

        const pageElement = document.getElementById('profile-page');
        pageElement.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-4">Profile Settings</h1>
                    <p class="text-gray-600">Manage your account and preferences</p>
                </div>

                <div class="grid lg:grid-cols-3 gap-8">
                    <!-- Profile Info -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <h2 class="text-xl font-semibold mb-4">Profile Information</h2>
                            <form data-action="update-profile" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                    <textarea name="bio" rows="3" 
                                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                              placeholder="Tell us about yourself"></textarea>
                                </div>
                                
                                <div class="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                        <input type="text" name="location" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                               placeholder="City, Country">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Website</label>
                                        <input type="url" name="website" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                               placeholder="https://yourwebsite.com">
                                    </div>
                                </div>

                                <div class="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                                        <input type="url" name="linkedin_url" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                               placeholder="LinkedIn profile URL">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Twitter</label>
                                        <input type="text" name="twitter_handle" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                               placeholder="@username">
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
                                    <input type="text" name="github_username" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                                           placeholder="GitHub username">
                                </div>

                                <div class="flex items-center">
                                    <input type="checkbox" name="is_profile_public" id="is_profile_public" 
                                           class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                                    <label for="is_profile_public" class="ml-2 block text-sm text-gray-900">
                                        Make profile public
                                    </label>
                                </div>

                                <button type="submit" 
                                        class="w-full btn-gradient text-white py-2 px-4 rounded-lg hover:bg-primary-700">
                                    Update Profile
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Sidebar -->
                    <div class="space-y-6">
                        <!-- Wallet Section -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h3 class="text-lg font-semibold mb-4">Wallet Connection</h3>
                            <div id="profile-wallet-section">
                                ${state.wallet.connected ? `
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between">
                                            <span class="text-sm text-gray-600">Connected</span>
                                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                                <i class="fas fa-check-circle mr-1"></i>Active
                                            </span>
                                        </div>
                                        <div class="bg-gray-50 p-3 rounded-lg">
                                            <p class="text-xs text-gray-500 mb-1">Address</p>
                                            <p class="font-mono text-sm break-all">${state.wallet.address}</p>
                                        </div>
                                        <button onclick="verifyWallet()" 
                                                class="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 text-sm">
                                            Verify Ownership
                                        </button>
                                        <button onclick="disconnectWallet()" 
                                                class="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">
                                            Disconnect
                                        </button>
                                    </div>
                                ` : `
                                    <div class="text-center">
                                        <i class="fas fa-wallet text-gray-400 text-3xl mb-3"></i>
                                        <p class="text-sm text-gray-600 mb-4">Connect your wallet to verify ownership and enable blockchain features</p>
                                        <button onclick="connectWallet()" 
                                                class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 text-sm">
                                            Connect Wallet
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Quick Stats -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h3 class="text-lg font-semibold mb-4">Quick Stats</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-sm text-gray-600">Events Created</span>
                                    <span class="font-semibold">0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-sm text-gray-600">Events Attended</span>
                                    <span class="font-semibold">0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-sm text-gray-600">NFT Tickets</span>
                                    <span class="font-semibold">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load current profile data
        this.loadProfileData();
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
                }
            }
        } catch (error) {
            console.error('Load profile error:', error);
        }
    }

    renderMyEventsPage() {
        if (!auth.isAuthenticated()) {
            showNotification('Please login to view your events', 'error');
            this.showPage('login');
            return;
        }

        const pageElement = document.getElementById('my-events-page');
        pageElement.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-4">My Events</h1>
                    <p class="text-gray-600">Manage your created events</p>
                </div>

                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="text-center py-12">
                        <i class="fas fa-calendar-plus text-gray-400 text-6xl mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
                        <p class="text-gray-600 mb-4">Create your first event to get started</p>
                        <button onclick="showPage('create-event')" class="btn-gradient text-white px-6 py-2 rounded-lg">
                            Create Event
                        </button>
                    </div>
                </div>
            </div>
        `;
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

console.log('App module loaded successfully');