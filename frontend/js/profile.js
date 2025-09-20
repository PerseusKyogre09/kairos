// Profile management module
class ProfileManager {
    constructor() {
        this.profile = null;
        this.skills = [];
        this.interests = [];
    }

    // Load current user profile
    async loadProfile() {
        try {
            if (!auth.isAuthenticated()) {
                return null;
            }

            const result = await profileAPI.getProfile();
            
            if (result.success) {
                this.profile = result.data.profile;
                this.skills = this.profile.skills || [];
                this.interests = this.profile.interests || [];
                
                this.updateProfileUI();
                return this.profile;
            } else {
                throw new Error(result.error || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Load profile error:', error);
            return null;
        }
    }

    // Update profile information
    async updateProfile(profileData) {
        try {
            showLoading(true);
            
            const result = await profileAPI.updateProfile(profileData);
            
            if (result.success) {
                this.profile = { ...this.profile, ...result.data.profile };
                this.updateProfileUI();
                
                showNotification('Profile updated successfully!', 'success');
                return result;
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Update skills
    async updateSkills(skills) {
        try {
            const result = await profileAPI.updateSkills(skills);
            
            if (result.success) {
                this.skills = result.data.skills;
                this.renderSkills();
                
                showNotification('Skills updated successfully!', 'success');
                return result;
            } else {
                throw new Error(result.error || 'Failed to update skills');
            }
        } catch (error) {
            console.error('Update skills error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Update interests
    async updateInterests(interests) {
        try {
            const result = await profileAPI.updateInterests(interests);
            
            if (result.success) {
                this.interests = result.data.interests;
                this.renderInterests();
                
                showNotification('Interests updated successfully!', 'success');
                return result;
            } else {
                throw new Error(result.error || 'Failed to update interests');
            }
        } catch (error) {
            console.error('Update interests error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Upload profile image
    async uploadProfileImage(file) {
        try {
            showLoading(true);
            
            // Validate file
            if (!this.validateImageFile(file)) {
                return { success: false, error: 'Invalid file type or size' };
            }
            
            const result = await profileAPI.uploadProfileImage(file);
            
            if (result.success) {
                this.profile.profile_image_url = result.data.profile_image_url;
                this.updateProfileUI();
                
                showNotification('Profile image updated successfully!', 'success');
                return result;
            } else {
                throw new Error(result.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload profile image error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Delete profile image
    async deleteProfileImage() {
        try {
            const result = await profileAPI.deleteProfileImage();
            
            if (result.success) {
                this.profile.profile_image_url = null;
                this.updateProfileUI();
                
                showNotification('Profile image deleted successfully!', 'success');
                return result;
            } else {
                throw new Error(result.error || 'Failed to delete image');
            }
        } catch (error) {
            console.error('Delete profile image error:', error);
            showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Validate image file
    validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.type)) {
            showNotification('Please select a valid image file (JPEG, PNG, or GIF)', 'error');
            return false;
        }
        
        if (file.size > maxSize) {
            showNotification('Image file must be less than 5MB', 'error');
            return false;
        }
        
        return true;
    }

    // Update profile UI elements
    updateProfileUI() {
        if (!this.profile) return;

        // Update navigation user info
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        
        if (userName) {
            userName.textContent = this.profile.username;
        }
        
        if (userAvatar && this.profile.profile_image_url) {
            userAvatar.src = this.profile.profile_image_url;
        }

        // Update profile form if on profile page
        this.populateProfileForm();
        
        // Update wallet section
        this.updateWalletSection();
    }

    // Populate profile form with current data
    populateProfileForm() {
        const form = document.querySelector('[data-action="update-profile"]');
        if (!form || !this.profile) return;

        // Populate text fields
        const fields = ['bio', 'location', 'website', 'linkedin_url', 'twitter_handle', 'github_username'];
        fields.forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.value = this.profile[field] || '';
            }
        });

        // Populate checkbox
        const publicCheckbox = form.querySelector('[name="is_profile_public"]');
        if (publicCheckbox) {
            publicCheckbox.checked = this.profile.is_profile_public || false;
        }
    }

    // Update wallet section in profile
    updateWalletSection() {
        const walletSection = document.getElementById('profile-wallet-section');
        if (!walletSection) return;

        const isConnected = state.wallet.connected;
        const isVerified = this.profile?.wallet_verified || false;
        
        walletSection.innerHTML = isConnected ? `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Connected</span>
                    <div class="flex items-center space-x-2">
                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            <i class="fas fa-check-circle mr-1"></i>Active
                        </span>
                        ${isVerified ? `
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                <i class="fas fa-shield-check mr-1"></i>Verified
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="bg-gray-50 p-3 rounded-lg">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-xs text-gray-500">Transaction Address</p>
                        <button onclick="copyWalletAddress()" class="text-xs text-primary-600 hover:text-primary-700">
                            <i class="fas fa-copy mr-1"></i>Copy
                        </button>
                    </div>
                    <p class="font-mono text-sm break-all">${state.wallet.address}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-info-circle mr-1"></i>
                        This address will be used for all blockchain transactions
                    </p>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    ${!isVerified ? `
                        <button onclick="verifyWallet()" 
                                class="bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 text-sm">
                            <i class="fas fa-shield-check mr-1"></i>Verify
                        </button>
                    ` : `
                        <button onclick="getWalletBalance()" 
                                class="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm">
                            <i class="fas fa-coins mr-1"></i>Balance
                        </button>
                    `}
                    <button onclick="disconnectWallet()" 
                            class="border border-gray-300 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-50 text-sm">
                        <i class="fas fa-unlink mr-1"></i>Disconnect
                    </button>
                </div>
            </div>
        ` : `
            <div class="text-center">
                <i class="fas fa-wallet text-gray-400 text-3xl mb-3"></i>
                <p class="text-sm text-gray-600 mb-4">Connect your wallet to verify ownership and enable blockchain features</p>
                <button onclick="connectWallet()" 
                        class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 text-sm">
                    <i class="fas fa-wallet mr-2"></i>Connect Wallet
                </button>
            </div>
        `;
    }

    // Render skills section
    renderSkills() {
        const skillsContainer = document.getElementById('skills-container');
        if (!skillsContainer) return;

        skillsContainer.innerHTML = `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-gray-700">Skills</label>
                    <button onclick="profileManager.showSkillsModal()" class="text-sm text-primary-600 hover:text-primary-700">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${this.skills.length > 0 ? this.skills.map(skill => `
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            ${skill}
                        </span>
                    `).join('') : '<span class="text-sm text-gray-500">No skills added yet</span>'}
                </div>
            </div>
        `;
    }

    // Render interests section
    renderInterests() {
        const interestsContainer = document.getElementById('interests-container');
        if (!interestsContainer) return;

        interestsContainer.innerHTML = `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-gray-700">Interests</label>
                    <button onclick="profileManager.showInterestsModal()" class="text-sm text-primary-600 hover:text-primary-700">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${this.interests.length > 0 ? this.interests.map(interest => `
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                            ${interest}
                        </span>
                    `).join('') : '<span class="text-sm text-gray-500">No interests added yet</span>'}
                </div>
            </div>
        `;
    }

    // Show skills editing modal
    showSkillsModal() {
        const modal = this.createTagModal('Skills', this.skills, (newSkills) => {
            this.updateSkills(newSkills);
        });
        document.body.appendChild(modal);
    }

    // Show interests editing modal
    showInterestsModal() {
        const modal = this.createTagModal('Interests', this.interests, (newInterests) => {
            this.updateInterests(newInterests);
        });
        document.body.appendChild(modal);
    }

    // Create tag editing modal
    createTagModal(title, currentTags, onSave) {
        const modalId = `${title.toLowerCase()}-modal`;
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Edit ${title}</h3>
                    <button onclick="document.getElementById('${modalId}').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="mb-4">
                    <input type="text" id="${modalId}-input" placeholder="Add ${title.toLowerCase()}..." 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <button onclick="addTag('${modalId}')" class="mt-2 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700">
                        Add ${title.slice(0, -1)}
                    </button>
                </div>
                
                <div id="${modalId}-tags" class="mb-4 min-h-[100px] max-h-[200px] overflow-y-auto">
                    ${currentTags.map((tag, index) => `
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2 mb-2">
                            ${tag}
                            <button onclick="removeTag('${modalId}', ${index})" class="ml-1 text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        </span>
                    `).join('')}
                </div>
                
                <div class="flex justify-end space-x-2">
                    <button onclick="document.getElementById('${modalId}').remove()" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onclick="saveTagsFromModal('${modalId}', '${title}')" 
                            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                        Save
                    </button>
                </div>
            </div>
        `;
        
        // Store callback and current tags on modal element
        modal._onSave = onSave;
        modal._currentTags = [...currentTags];
        
        // Add enter key listener for input
        setTimeout(() => {
            const input = document.getElementById(`${modalId}-input`);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        addTag(modalId);
                    }
                });
                input.focus();
            }
        }, 100);
        
        return modal;
    }
}

// Initialize profile manager
const profileManager = new ProfileManager();

// Global profile functions
function addTag(modalId) {
    const input = document.getElementById(`${modalId}-input`);
    const tagsContainer = document.getElementById(`${modalId}-tags`);
    const modal = document.getElementById(modalId);
    
    if (!input || !tagsContainer || !modal) return;
    
    const tag = input.value.trim();
    if (!tag || modal._currentTags.includes(tag)) {
        input.value = '';
        return;
    }
    
    modal._currentTags.push(tag);
    input.value = '';
    
    // Re-render tags
    tagsContainer.innerHTML = modal._currentTags.map((tag, index) => `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2 mb-2">
            ${tag}
            <button onclick="removeTag('${modalId}', ${index})" class="ml-1 text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xs"></i>
            </button>
        </span>
    `).join('');
}

function removeTag(modalId, index) {
    const modal = document.getElementById(modalId);
    const tagsContainer = document.getElementById(`${modalId}-tags`);
    
    if (!modal || !tagsContainer) return;
    
    modal._currentTags.splice(index, 1);
    
    // Re-render tags
    tagsContainer.innerHTML = modal._currentTags.map((tag, index) => `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2 mb-2">
            ${tag}
            <button onclick="removeTag('${modalId}', ${index})" class="ml-1 text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xs"></i>
            </button>
        </span>
    `).join('');
}

function saveTagsFromModal(modalId, title) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal._onSave) return;
    
    modal._onSave(modal._currentTags);
    modal.remove();
}

// Profile image upload handler
function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        profileManager.uploadProfileImage(file);
    }
}

// Event listeners
eventBus.on('auth:login', () => {
    profileManager.loadProfile();
});

eventBus.on('wallet:connected', () => {
    profileManager.updateWalletSection();
});

eventBus.on('wallet:disconnected', () => {
    profileManager.updateWalletSection();
});

eventBus.on('wallet:verified', () => {
    if (profileManager.profile) {
        profileManager.profile.wallet_verified = true;
        profileManager.updateWalletSection();
    }
});

eventBus.on('page:changed', (data) => {
    if (data.page === 'profile' && auth.isAuthenticated()) {
        setTimeout(() => {
            profileManager.loadProfile();
        }, 100);
    }
});

console.log('Profile module loaded successfully');