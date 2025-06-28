/**
 * Main Application Controller
 * Soldier Sign-Out System
 */
class SoldierSignOutApp {
    constructor() {
        this.signouts = [];
        this.filteredSignouts = [];
        this.currentUser = null;
        this.currentSignOutId = null;
        this.durationInterval = null;
        
        // Initialize modules
        this.notificationManager = new NotificationManager();
        this.barcodeManager = new BarcodeManager(this.notificationManager);
        
        // Make barcode manager globally accessible for onclick handlers
        window.barcodeManager = this.barcodeManager;
        
        this.initializeElements();
        this.checkAuthentication();
    }

    initializeElements() {
        // User selector
        this.userSelectorBtn = document.getElementById('userSelectorBtn');
        this.userSelectorDropdown = document.getElementById('userSelectorDropdown');
        this.currentUserName = document.getElementById('currentUserName');
        this.usersList = document.getElementById('usersList');
        
        // Hamburger menu
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.hamburgerMenu = document.querySelector('.hamburger-menu');
        this.hamburgerDropdown = document.getElementById('hamburgerDropdown');
        
        // Buttons
        this.refreshBtn = document.getElementById('refreshBtn');
        this.newSignOutBtn = document.getElementById('newSignOutBtn');
        this.logsBtn = document.getElementById('logsBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.changeUserBtn = document.getElementById('changeUserBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.backToDashboard = document.getElementById('backToDashboard');
        this.backToMainBtn = document.getElementById('backToMainBtn');
        
        // Views
        this.dashboardView = document.getElementById('dashboardView');
        this.logsView = document.getElementById('logsView');
        this.settingsView = document.getElementById('settingsView');
        
        // Modal elements
        this.signOutModal = document.getElementById('signOutModal');
        this.closeModal = document.getElementById('closeModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.signOutForm = document.getElementById('signOutForm');
        
        // PIN modal
        this.pinModal = document.getElementById('pinModal');
        this.closePinModalBtn = document.getElementById('closePinModal');
        this.pinInput = document.getElementById('pinInput');
        this.pinSubmit = document.getElementById('pinSubmit');
        this.pinCancel = document.getElementById('pinCancel');
        this.pinError = document.getElementById('pinError');
        this.signInDetails = document.getElementById('signInDetails');
        
        // Info modal
        this.infoModal = document.getElementById('infoModal');
        this.closeInfoModalBtn = document.getElementById('closeInfoModal');
        this.infoModalContent = document.getElementById('infoModalContent');
        
        // Search
        this.searchInput = document.getElementById('searchInput');
        
        // Tables
        this.currentSignOutsTableBody = document.getElementById('currentSignOutsTableBody');
        this.logsTableBody = document.getElementById('logsTableBody');
        this.emptyState = document.getElementById('emptyState');
        this.logsEmptyState = document.getElementById('logsEmptyState');
        
        // Counts
        this.currentlyOutCount = document.getElementById('currentlyOutCount');
        this.totalTodayCount = document.getElementById('totalTodayCount');
        this.totalRecordsCount = document.getElementById('totalRecordsCount');
        
        // Filters
        this.startDate = document.getElementById('startDate');
        this.endDate = document.getElementById('endDate');
        this.soldierNameFilter = document.getElementById('soldierNameFilter');
        this.locationFilter = document.getElementById('locationFilter');
        this.statusFilter = document.getElementById('statusFilter');
        this.applyFiltersBtn = document.getElementById('applyFiltersBtn');
        this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        this.exportCsvBtn = document.getElementById('exportCsvBtn');
        
        // Settings elements
        this.currentUserDisplay = document.getElementById('currentUserDisplay');
        this.userRoleDisplay = document.getElementById('userRoleDisplay');
        this.maxSignOutDuration = document.getElementById('maxSignOutDuration');
        this.warningThreshold = document.getElementById('warningThreshold');
        this.updateDurationBtn = document.getElementById('updateDurationBtn');
        this.updateWarningBtn = document.getElementById('updateWarningBtn');
        this.exportAllDataBtn = document.getElementById('exportAllDataBtn');
        this.backupDataBtn = document.getElementById('backupDataBtn');
        this.clearOldRecordsBtn = document.getElementById('clearOldRecordsBtn');
        this.resetSystemBtn = document.getElementById('resetSystemBtn');
        
        // User Management elements
        this.createUserBtn = document.getElementById('createUserBtn');
        this.changePinBtn = document.getElementById('changePinBtn');
        this.deleteUserBtn = document.getElementById('deleteUserBtn');
        
        // User Management Modals
        this.createUserModal = document.getElementById('createUserModal');
        this.closeCreateUserModal = document.getElementById('closeCreateUserModal');
        this.createUserForm = document.getElementById('createUserForm');
        this.cancelCreateUser = document.getElementById('cancelCreateUser');
        this.submitCreateUser = document.getElementById('submitCreateUser');
        this.createUserError = document.getElementById('createUserError');
        
        this.changePinModal = document.getElementById('changePinModal');
        this.closeChangePinModal = document.getElementById('closeChangePinModal');
        this.changePinForm = document.getElementById('changePinForm');
        this.changePinUser = document.getElementById('changePinUser');
        this.cancelChangePin = document.getElementById('cancelChangePin');
        this.submitChangePin = document.getElementById('submitChangePin');
        this.changePinError = document.getElementById('changePinError');
        
        this.deleteUserModal = document.getElementById('deleteUserModal');
        this.closeDeleteUserModal = document.getElementById('closeDeleteUserModal');
        this.deleteUserForm = document.getElementById('deleteUserForm');
        this.deleteUserSelect = document.getElementById('deleteUserSelect');
        this.cancelDeleteUser = document.getElementById('cancelDeleteUser');
        this.submitDeleteUser = document.getElementById('submitDeleteUser');
        this.deleteUserError = document.getElementById('deleteUserError');
    }

    async checkAuthentication() {
        try {
            // Prevent redirect loop - don't redirect if we're already on login page
            if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
                console.log('Already on login page, skipping auth check');
                return;
            }
            
            // Prevent multiple concurrent auth checks
            if (this.authCheckInProgress) {
                console.log('Auth check already in progress, skipping');
                return;
            }
            this.authCheckInProgress = true;
            
            console.log('Checking authentication...');
            const response = await Utils.fetchWithAuth('/api/signouts/auth/check');
            
            // DEBUG: Log response details
            console.log('Auth check response status:', response.status);
            console.log('Auth check response ok:', response.ok);
            
            if (!response.ok) {
                console.log('Auth check failed - response not ok, status:', response.status);
                throw new Error(`Auth check failed with status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Auth response:', result);
            
            if (!result.authenticated) {
                console.log('Not authenticated, redirecting to login...');
                // Clear any existing intervals/timers
                if (this.durationInterval) {
                    clearInterval(this.durationInterval);
                }
                
                // Add a small delay and check if already redirecting
                if (!window.location.href.includes('/login')) {
                    setTimeout(() => {
                        console.log('EXECUTING REDIRECT TO LOGIN - NOT AUTHENTICATED');
                        window.location.href = '/login';
                    }, 100);
                }
                return;
            }
            
            console.log('Authentication successful - NO REDIRECT NEEDED');
            console.log('User data:', result.user);
            console.log('About to set currentUser and start normal app flow...');
            this.currentUser = result.user;
            if (this.currentUserName) {
                this.currentUserName.textContent = `${result.user.rank} ${result.user.full_name}`;
            }
            console.log('About to attach event listeners...');
            this.attachEventListeners();
            console.log('About to load current signouts...');
            this.loadCurrentSignOuts();
            console.log('About to start duration updates...');
            this.startDurationUpdates();
            console.log('Authentication setup complete - no redirects should happen now');
            
        } catch (error) {
            console.error('Authentication check failed with error:', error);
            // Prevent redirect loop
            if (window.location.pathname !== '/login' && window.location.pathname !== '/login.html') {
                if (!window.location.href.includes('/login')) {
                    setTimeout(() => {
                        console.log('EXECUTING REDIRECT TO LOGIN - DUE TO ERROR:', error.message);
                        window.location.href = '/login';
                    }, 100);
                }
            }
        } finally {
            this.authCheckInProgress = false;
        }
    }

    attachEventListeners() {
        // User selector events
        this.userSelectorBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleUserSelector();
        });
        
        // Close user selector when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.userSelectorDropdown?.parentElement.contains(e.target)) {
                this.closeUserSelector();
            }
        });
        
        // Hamburger menu events
        this.hamburgerBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHamburgerMenu();
        });
        
        // Close hamburger menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.hamburgerMenu?.contains(e.target)) {
                this.closeHamburgerMenu();
            }
        });
        
        // Close hamburger menu when clicking dropdown items
        this.hamburgerDropdown?.addEventListener('click', () => {
            this.closeHamburgerMenu();
        });
        
        // Button events
        this.refreshBtn?.addEventListener('click', () => this.loadCurrentSignOuts());
        this.newSignOutBtn?.addEventListener('click', () => this.openNewSignOutModal());
        this.logsBtn?.addEventListener('click', () => this.showLogsView());
        this.settingsBtn?.addEventListener('click', () => this.showSettingsWithAuth());
        this.logoutBtn?.addEventListener('click', () => this.logout());
        this.backToDashboard?.addEventListener('click', () => this.showDashboardView());
        this.backToMainBtn?.addEventListener('click', () => this.showDashboardView());
        
        // Modal events
        this.closeModal?.addEventListener('click', () => this.closeNewSignOutModal());
        this.cancelBtn?.addEventListener('click', () => this.closeNewSignOutModal());
        this.signOutForm?.addEventListener('submit', (e) => this.handleSignOut(e));
        
        // Ensure Enter key submits form instead of triggering button clicks
        this.signOutForm?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Only submit if we're not in a textarea (for notes field)
                if (e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.handleSignOut(e);
                }
            }
        });
        
        // PIN modal events
        this.closePinModalBtn?.addEventListener('click', () => this.closePinModal());
        this.pinCancel?.addEventListener('click', () => this.closePinModal());
        this.pinSubmit?.addEventListener('click', () => this.handleSignIn());
        this.pinInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignIn();
        });
        
        // Info modal events
        this.closeInfoModalBtn?.addEventListener('click', () => this.closeInfoModal());
        
        // Search and filters
        this.searchInput?.addEventListener('input', () => this.filterCurrentSignOuts());
        this.applyFiltersBtn?.addEventListener('click', () => this.loadFilteredLogs());
        this.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
        this.exportCsvBtn?.addEventListener('click', () => this.exportLogs());
        
        // Settings event listeners
        this.updateDurationBtn?.addEventListener('click', () => this.updateMaxDuration());
        this.updateWarningBtn?.addEventListener('click', () => this.updateWarningThreshold());
        this.exportAllDataBtn?.addEventListener('click', () => this.exportAllData());
        this.backupDataBtn?.addEventListener('click', () => this.createBackup());
        this.clearOldRecordsBtn?.addEventListener('click', () => this.clearOldRecords());
        this.resetSystemBtn?.addEventListener('click', () => this.resetSystem());
        
        // User Management event listeners
        this.createUserBtn?.addEventListener('click', () => this.openCreateUserModal());
        this.changePinBtn?.addEventListener('click', () => this.openChangePinModal());
        this.deleteUserBtn?.addEventListener('click', () => this.openDeleteUserModal());
        
        // User Management Modal Events
        this.closeCreateUserModal?.addEventListener('click', () => this.closeCreateUserModal());
        this.cancelCreateUser?.addEventListener('click', () => this.closeCreateUserModal());
        this.submitCreateUser?.addEventListener('click', () => this.handleCreateUser());
        this.createUserForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateUser();
        });
        
        this.closeChangePinModal?.addEventListener('click', () => this.closeChangePinModal());
        this.cancelChangePin?.addEventListener('click', () => this.closeChangePinModal());
        this.submitChangePin?.addEventListener('click', () => this.handleChangePin());
        this.changePinForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChangePin();
        });
        
        this.closeDeleteUserModal?.addEventListener('click', () => this.closeDeleteUserModal());
        this.cancelDeleteUser?.addEventListener('click', () => this.closeDeleteUserModal());
        this.submitDeleteUser?.addEventListener('click', () => this.handleDeleteUser());
        this.deleteUserForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDeleteUser();
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.signOutModal) this.closeNewSignOutModal();
            if (e.target === this.pinModal) this.closePinModal();
            if (e.target === this.infoModal) this.closeInfoModal();
            if (e.target === this.createUserModal) this.closeCreateUserModal();
            if (e.target === this.changePinModal) this.closeChangePinModal();
            if (e.target === this.deleteUserModal) this.closeDeleteUserModal();
        });
        
        // Event delegation for dynamically created buttons
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.sign-in-btn')) {
                const button = e.target.closest('.sign-in-btn');
                const signoutId = button.dataset.signoutId;
                const soldierNames = button.dataset.soldierNames;
                await this.promptSignIn(signoutId, soldierNames);
            }
            
            if (e.target.closest('.info-btn')) {
                const button = e.target.closest('.info-btn');
                const signoutId = button.dataset.signoutId;
                this.showSignOutInfo(signoutId);
            }
        });
    }

    // Hamburger Menu Management
    toggleHamburgerMenu() {
        if (this.hamburgerMenu.classList.contains('active')) {
            this.closeHamburgerMenu();
        } else {
            this.openHamburgerMenu();
        }
    }
    
    openHamburgerMenu() {
        this.hamburgerMenu.classList.add('active');
        // Add slight delay to ensure smooth animation
        setTimeout(() => {
            this.hamburgerDropdown.style.pointerEvents = 'auto';
        }, 100);
    }
    
    closeHamburgerMenu() {
        this.hamburgerMenu.classList.remove('active');
        this.hamburgerDropdown.style.pointerEvents = 'none';
    }

    // User Selector Management
    toggleUserSelector() {
        if (this.userSelectorDropdown.parentElement.classList.contains('active')) {
            this.closeUserSelector();
        } else {
            this.openUserSelector();
        }
    }
    
    async openUserSelector() {
        this.userSelectorDropdown.parentElement.classList.add('active');
        this.userSelectorBtn.classList.add('active');
        
        // Load users when opening
        await this.loadUsers();
    }
    
    closeUserSelector() {
        this.userSelectorDropdown.parentElement.classList.remove('active');
        this.userSelectorBtn.classList.remove('active');
    }

    async loadUsers() {
        try {
            this.usersList.innerHTML = '<div class="users-loading">Loading users...</div>';
            
            const response = await Utils.fetchWithAuth('/api/signouts/auth/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const users = await response.json();
            this.renderUsersList(users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.usersList.innerHTML = '<div class="users-error">Failed to load users</div>';
        }
    }

    renderUsersList(users) {
        if (!users || users.length === 0) {
            this.usersList.innerHTML = '<div class="users-error">No users found</div>';
            return;
        }

        this.usersList.innerHTML = users.map(user => {
            const isCurrent = this.currentUser && this.currentUser.id === user.id;
            return `
                <button class="user-item ${isCurrent ? 'current' : ''}" data-user-id="${user.id}">
                    <div class="user-item-content">
                        <div class="user-item-name">${user.rank} ${user.full_name}</div>
                        <div class="user-item-role">${user.role || 'User'}</div>
                    </div>
                    ${isCurrent ? '<span class="user-item-indicator">●</span>' : ''}
                </button>
            `;
        }).join('');

        // Add click handlers to user items
        this.usersList.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.userId);
                const user = users.find(u => u.id === userId);
                if (user && user.id !== this.currentUser?.id) {
                    this.promptUserSwitch(user);
                }
                this.closeUserSelector();
            });
        });
    }

    promptUserSwitch(user) {
        // Store the target user
        this.targetUser = user;
        
        // Show PIN modal for user switching
        if (this.pinModal) {
            this.pinModal.style.display = 'flex';
            this.pinModal.style.visibility = 'visible';
            this.pinModal.style.opacity = '1';
            this.pinModal.classList.add('show');
        }
        
        // Set purpose for user switching
        this.pinModal.dataset.purpose = 'user-switch';
        
        // Update modal title
        const modalTitle = this.pinModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = `Switch to ${user.rank} ${user.full_name}`;
        }
        
        // Hide sign-in details for user switching
        if (this.signInDetails) {
            this.signInDetails.style.display = 'none';
        }
        
        if (this.pinInput) {
            this.pinInput.value = '';
            this.pinInput.focus();
        }
        
        if (this.pinError) {
            this.pinError.style.display = 'none';
        }
    }

    // View Management
    showDashboardView() {
        this.dashboardView.style.display = 'block';
        this.logsView.style.display = 'none';
        if (this.settingsView) this.settingsView.style.display = 'none';
        this.loadCurrentSignOuts();
        this.startDurationUpdates();
    }

    showLogsView() {
        this.dashboardView.style.display = 'none';
        this.logsView.style.display = 'block';
        if (this.settingsView) this.settingsView.style.display = 'none';
        this.stopDurationUpdates();
        this.loadFilteredLogs();
    }

    showSettingsWithAuth() {
        console.log('showSettingsWithAuth called');
        this.requestPinForSettings();
    }

    requestPinForSettings() {
        console.log('requestPinForSettings called');
        
        if (!this.pinModal) {
            console.error('PIN modal element not found!');
            this.notificationManager.showNotification('Settings modal not available', 'error');
            return;
        }
        
        // Show PIN modal for settings access
        this.pinModal.style.display = 'flex';
        this.pinModal.style.visibility = 'visible';
        this.pinModal.style.opacity = '1';
        this.pinModal.style.zIndex = '1001';
        this.pinModal.classList.add('show');
        
        console.log('PIN modal display set to flex');
        
        if (this.pinInput) {
            this.pinInput.value = '';
            this.pinInput.focus();
        }
        
        if (this.pinError) {
            this.pinError.style.display = 'none';
        }
        
        // Set a flag to indicate this is for settings access
        this.pinModal.dataset.purpose = 'settings';
        console.log('PIN modal purpose set to settings');
        
        // Update modal title
        const modalTitle = this.pinModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Enter PIN for Settings Access';
            console.log('Modal title updated');
        } else {
            console.error('Modal title element not found!');
        }
        
        // Hide sign-in details section for settings access
        if (this.signInDetails) {
            this.signInDetails.style.display = 'none';
            console.log('Sign-in details hidden for settings access');
        }
        
        // Force a repaint
        this.pinModal.offsetHeight;
        
        console.log('PIN modal should now be visible');
    }

    showSettingsView() {
        console.log('showSettingsView called');
        
        if (this.dashboardView) this.dashboardView.style.display = 'none';
        if (this.logsView) this.logsView.style.display = 'none';
        if (this.settingsView) {
            this.settingsView.style.display = 'block';
            console.log('Settings view should now be visible');
        } else {
            console.error('Settings view element not found!');
        }
        this.stopDurationUpdates();
        this.loadSettingsData();
    }

    // Authentication and PIN Modal Management
    async handleSignIn() {
        const pin = this.pinInput?.value;
        
        if (!pin) {
            this.showPinError('Please enter a PIN');
            return;
        }
        
        try {
            // Check if this is for settings access
            if (this.pinModal?.dataset.purpose === 'settings') {
                await this.authenticateForSettings(pin);
            } else if (this.pinModal?.dataset.purpose === 'user-switch') {
                await this.authenticateUserSwitch(pin);
            } else {
                // Regular sign-in flow
                await this.processSignIn(pin);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.showPinError('Authentication failed');
        }
    }

    async authenticateForSettings(pin) {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/validate-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            
            if (!response.ok) {
                throw new Error('Invalid PIN');
            }
            
            const result = await response.json();
            
            if (result.valid) {
                this.closePinModal();
                this.showSettingsView();
                this.notificationManager.showNotification('Settings access granted', 'success');
            } else {
                this.showPinError('Invalid PIN');
            }
        } catch (error) {
            console.error('Settings authentication error:', error);
            this.showPinError('Invalid PIN');
        }
    }

    async authenticateUserSwitch(pin) {
        if (!this.targetUser) {
            this.showPinError('No user selected');
            return;
        }

        // Store user info before async operations that might clear it
        const targetUserInfo = {
            id: this.targetUser.id,
            rank: this.targetUser.rank,
            full_name: this.targetUser.full_name
        };

        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: targetUserInfo.id, 
                    pin: pin 
                })
            });
            
            if (!response.ok) {
                throw new Error('Invalid PIN');
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.closePinModal();
                this.notificationManager.showNotification(`Switched to ${targetUserInfo.rank} ${targetUserInfo.full_name}`, 'success');
                
                // Reload the page to ensure all states are refreshed with new user context
                setTimeout(() => {
                    window.location.reload();
                }, 1000); // Brief delay to show the success message
            } else {
                this.showPinError('Invalid PIN');
            }
        } catch (error) {
            console.error('User switch error:', error);
            this.showPinError('Invalid PIN');
        }
    }

    async processSignIn(pin) {
        if (!this.currentSignOutId) {
            this.showPinError('No sign-out selected');
            return;
        }

        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${this.currentSignOutId}/signin`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Sign-in failed');
            }
            
            const result = await response.json();
            
            // Check if the response contains a success message
            if (result.message) {
                this.closePinModal();
                this.currentSignOutId = null;
                
                // Reload current sign-outs to reflect the change
                this.loadCurrentSignOuts();
                this.notificationManager.showNotification('Soldiers signed in successfully', 'success');
            } else {
                this.showPinError('Sign-in failed');
            }
        } catch (error) {
            console.error('Sign-in error:', error);
            this.showPinError(error.message || 'Invalid PIN or sign-in failed');
        }
    }

    closePinModal() {
        if (this.pinModal) {
            this.pinModal.style.display = 'none';
            this.pinModal.style.visibility = 'hidden';
            this.pinModal.style.opacity = '0';
            this.pinModal.classList.remove('show');
        }
        
        if (this.pinInput) {
            this.pinInput.value = '';
        }
        
        if (this.pinError) {
            this.pinError.style.display = 'none';
        }
        
        // Reset modal state - show sign-in details by default
        this.resetPinModalState();
        
        // Clear the purpose flag
        if (this.pinModal) {
            delete this.pinModal.dataset.purpose;
        }
        
        this.currentSignOutId = null;
    }

    resetPinModalState() {
        // Reset modal title
        const modalTitle = this.pinModal?.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Enter PIN to Sign In';
        }
        
        // Show sign-in details section by default
        if (this.signInDetails) {
            this.signInDetails.style.display = 'block';
        }
        
        // Clear target user
        this.targetUser = null;
    }

    showPinError(message) {
        if (this.pinError) {
            this.pinError.textContent = message;
            this.pinError.style.display = 'block';
        }
    }

    async promptSignIn(signoutId, soldierNames) {
        this.currentSignOutId = signoutId;
        
        // Show PIN modal for sign-in
        if (this.pinModal) {
            this.pinModal.style.display = 'flex';
            this.pinModal.style.visibility = 'visible';
            this.pinModal.style.opacity = '1';
            this.pinModal.classList.add('show');
        }
        
        // Reset modal state for sign-in
        this.resetPinModalState();
        
        // Fetch sign-out details to show in modal
        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${signoutId}`);
            if (response.ok) {
                const signout = await response.json();
                this.updateSignInDetails(signout);
            } else {
                // Fallback to just showing soldier names if fetch fails
                this.updateSignInDetailsBasic(soldierNames, 'Unknown Location');
            }
        } catch (error) {
            console.error('Error fetching sign-out details for modal:', error);
            // Fallback to just showing soldier names if fetch fails
            this.updateSignInDetailsBasic(soldierNames, 'Unknown Location');
        }
        
        if (this.pinInput) {
            this.pinInput.value = '';
            this.pinInput.focus();
        }
        
        if (this.pinError) {
            this.pinError.style.display = 'none';
        }
    }

    updateSignInDetails(signout) {
        if (!this.signInDetails) return;
        
        // Parse soldiers data
        let soldiers = signout.soldiers;
        if (!soldiers && signout.soldier_rank) {
            soldiers = [{
                rank: signout.soldier_rank,
                firstName: signout.soldier_first_name,
                lastName: signout.soldier_last_name,
                dodId: signout.soldier_dod_id
            }];
        }
        
        const soldierChips = Utils.renderSoldierChips(soldiers);
        const signOutTime = Utils.formatTime(signout.sign_out_time);
        
        this.signInDetails.innerHTML = `
            <div class="sign-in-info">
                <div class="sign-in-section">
                    <h4>Destination</h4>
                    <div class="destination-info">
                        <strong>${signout.location}</strong>
                        ${signout.notes ? `<div class="notes">${signout.notes}</div>` : ''}
                    </div>
                </div>
                <div class="sign-in-section">
                    <h4>Soldiers in Group</h4>
                    <div class="soldiers-info">
                        ${soldierChips}
                    </div>
                </div>
                <div class="sign-in-section">
                    <h4>Sign-Out Time</h4>
                    <div class="time-info">${signOutTime}</div>
                </div>
            </div>
        `;
    }

    updateSignInDetailsBasic(soldierNames, location) {
        if (!this.signInDetails) return;
        
        this.signInDetails.innerHTML = `
            <div class="sign-in-info">
                <div class="sign-in-section">
                    <h4>Destination</h4>
                    <div class="destination-info">
                        <strong>${location}</strong>
                    </div>
                </div>
                <div class="sign-in-section">
                    <h4>Soldiers in Group</h4>
                    <div class="soldiers-info">
                        ${soldierNames}
                    </div>
                </div>
            </div>
        `;
    }

    async changeUser() {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/change-user', {
                method: 'POST'
            });
            
            if (response.ok) {
                localStorage.clear();
                window.location.href = '/login';
            } else {
                this.notificationManager.showNotification('Failed to change user', 'error');
            }
        } catch (error) {
            console.error('Error changing user:', error);
            this.notificationManager.showNotification('Failed to change user', 'error');
        }
    }

    async showSignOutInfo(signoutId) {
        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${signoutId}`);
            if (!response.ok) throw new Error('Failed to fetch sign-out details');
            
            const signout = await response.json();
            
            // Parse soldiers data
            let soldiers = signout.soldiers;
            if (!soldiers && signout.soldier_rank) {
                soldiers = [{
                    rank: signout.soldier_rank,
                    firstName: signout.soldier_first_name,
                    lastName: signout.soldier_last_name,
                    dodId: signout.soldier_dod_id
                }];
            }
            
            const signOutTime = Utils.formatTime(signout.sign_out_time);
            const signInTime = signout.sign_in_time ? Utils.formatTime(signout.sign_in_time) : 'Not signed in';
            const duration = signout.sign_in_time 
                ? Utils.calculateDuration(signout.sign_out_time, signout.sign_in_time)
                : Utils.calculateDuration(signout.sign_out_time);
            
            const soldierChips = Utils.renderSoldierChips(soldiers);
            
            const content = `
                <div class="info-section">
                    <h3>Sign-Out Details</h3>
                    <div class="info-grid">
                        <div class="info-box">
                            <span class="info-label">ID</span>
                            <span class="info-value">${signout.signout_id}</span>
                        </div>
                        <div class="info-box">
                            <span class="info-label">Soldiers</span>
                            <div class="info-value">${soldierChips}</div>
                        </div>
                        <div class="info-box">
                            <span class="info-label">Location</span>
                            <span class="info-value">${signout.location}</span>
                        </div>
                        <div class="info-box">
                            <span class="info-label">Sign-Out Time</span>
                            <span class="info-value">${signOutTime}</span>
                        </div>
                        <div class="info-box">
                            <span class="info-label">Sign-In Time</span>
                            <span class="info-value">${signInTime}</span>
                        </div>
                        <div class="info-box">
                            <span class="info-label">Duration</span>
                            <span class="info-value">${duration}</span>
                        </div>
                        <div class="info-box">
                            <span class="info-label">Signed Out By</span>
                            <span class="info-value">${signout.signed_out_by_name}</span>
                        </div>
                        ${signout.signed_in_by_name ? `
                        <div class="info-box">
                            <span class="info-label">Signed In By</span>
                            <span class="info-value">${signout.signed_in_by_name}</span>
                        </div>
                        ` : ''}
                        ${signout.notes ? `
                        <div class="info-box">
                            <span class="info-label">Notes</span>
                            <span class="info-value">${signout.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            this.infoModalContent.innerHTML = content;
            this.infoModal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error loading sign-out info:', error);
            this.notificationManager.showNotification('Failed to load sign-out details', 'error');
        }
    }

    closeInfoModal() {
        if (this.infoModal) {
            this.infoModal.style.display = 'none';
        }
    }

    // Sign-Out Modal Management
    openNewSignOutModal() {
        if (this.signOutModal) {
            this.signOutModal.style.display = 'flex';
            
            // Reset form
            if (this.signOutForm) {
                this.signOutForm.reset();
            }
            
            // Clear any existing soldiers from previous sessions
            this.barcodeManager.clearSoldiers();
            
            // Focus first input
            const firstInput = this.signOutForm?.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    closeNewSignOutModal() {
        if (this.signOutModal) {
            this.signOutModal.style.display = 'none';
        }
        
        // Reset form
        if (this.signOutForm) {
            this.signOutForm.reset();
        }
        
        // Clear soldiers when modal is closed/cancelled
        this.barcodeManager.clearSoldiers();
    }

    async handleSignOut(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(this.signOutForm);
            const signOutData = {
                soldiers: this.barcodeManager.getSoldiers(), // Get soldiers from barcode manager
                location: formData.get('location'),
                notes: formData.get('notes') || '',
                pin: formData.get('pin') // Add PIN for backend validation
            };
            
            if (!signOutData.soldiers || signOutData.soldiers.length === 0) {
                this.notificationManager.showNotification('Please select at least one soldier', 'warning');
                return;
            }
            
            if (!signOutData.location) {
                this.notificationManager.showNotification('Please enter a location', 'warning');
                return;
            }
            
            if (!signOutData.pin) {
                this.notificationManager.showNotification('Please enter your PIN', 'warning');
                return;
            }
            
            Utils.showLoading(true);
            
            const response = await Utils.fetchWithAuth('/api/signouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signOutData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create sign-out');
            }
            
            const result = await response.json();
            
            this.closeNewSignOutModal();
            this.barcodeManager.clearSoldiers(); // Clear soldiers after successful sign-out
            this.loadCurrentSignOuts();
            this.notificationManager.showNotification('Sign-out created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating sign-out:', error);
            this.notificationManager.showNotification('Failed to create sign-out', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    // Authentication Methods
    async logout() {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                localStorage.clear();
                this.notificationManager.showNotification('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                this.notificationManager.showNotification('Failed to logout', 'error');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            this.notificationManager.showNotification('Failed to logout', 'error');
        }
    }

    // Filter and Search Functions
    filterCurrentSignOuts() {
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        
        this.filteredSignouts = this.signouts.filter(signout => {
            const soldierNames = signout.soldier_names.toLowerCase();
            const location = signout.location.toLowerCase();
            const notes = (signout.notes || '').toLowerCase();
            const signedOutBy = signout.signed_out_by_name.toLowerCase();
            
            return soldierNames.includes(searchTerm) ||
                   location.includes(searchTerm) ||
                   notes.includes(searchTerm) ||
                   signedOutBy.includes(searchTerm) ||
                   signout.signout_id.toString().includes(searchTerm);
        });
        
        this.renderCurrentSignOuts();
    }

    clearFilters() {
        if (this.startDate) this.startDate.value = '';
        if (this.endDate) this.endDate.value = '';
        if (this.soldierNameFilter) this.soldierNameFilter.value = '';
        if (this.locationFilter) this.locationFilter.value = '';
        if (this.statusFilter) this.statusFilter.value = '';
        
        this.loadFilteredLogs();
    }

    async exportLogs() {
        try {
            Utils.showLoading(true);
            
            const params = new URLSearchParams();
            if (this.startDate?.value) params.append('startDate', this.startDate.value);
            if (this.endDate?.value) params.append('endDate', this.endDate.value);
            if (this.soldierNameFilter?.value) params.append('soldierName', this.soldierNameFilter.value);
            if (this.locationFilter?.value) params.append('location', this.locationFilter.value);
            if (this.statusFilter?.value) params.append('status', this.statusFilter.value);
            
            const response = await Utils.fetchWithAuth(`/api/signouts/export/logs?${params}`);
            
            if (!response.ok) throw new Error('Failed to export logs');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `signout-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.notificationManager.showNotification('Logs exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.notificationManager.showNotification('Failed to export logs', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    // Data Loading and Rendering Functions
    async loadCurrentSignOuts() {
        try {
            Utils.showLoading(true);
            const response = await Utils.fetchWithAuth('/api/signouts/current');
            
            if (!response.ok) throw new Error('Failed to fetch current sign-outs');
            
            this.signouts = await response.json();
            this.filteredSignouts = [...this.signouts];
            this.renderCurrentSignOuts();
            this.updateCounts();
        } catch (error) {
            console.error('Error loading current sign-outs:', error);
            this.notificationManager.showNotification('Failed to load current sign-outs', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadAllSignOuts() {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts');
            if (!response.ok) throw new Error('Failed to fetch all sign-outs');
            return await response.json();
        } catch (error) {
            console.error('Error loading all sign-outs:', error);
            return [];
        }
    }

    async updateCounts() {
        try {
            const allSignOuts = await this.loadAllSignOuts();
            const today = new Date().toDateString();
            
            if (this.currentlyOutCount) {
                this.currentlyOutCount.textContent = this.signouts.length;
            }
            if (this.totalTodayCount) {
                this.totalTodayCount.textContent = allSignOuts.filter(s => 
                    new Date(s.sign_out_time).toDateString() === today
                ).length;
            }
            if (this.totalRecordsCount) {
                this.totalRecordsCount.textContent = allSignOuts.length;
            }
        } catch (error) {
            console.error('Error updating counts:', error);
        }
    }

    renderCurrentSignOuts() {
        const tbody = this.currentSignOutsTableBody;
        const emptyState = this.emptyState;
        
        if (!tbody) {
            console.warn('Table body not found');
            return;
        }
        
        if (!this.filteredSignouts || this.filteredSignouts.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = this.filteredSignouts.map(signout => {
            const duration = Utils.calculateDuration(signout.sign_out_time);
            const signOutTime = Utils.formatTime(signout.sign_out_time);
            
            // Calculate status based on duration
            const hours = Utils.getDurationHours(signout.sign_out_time);
            let statusClass = 'status-normal';
            
            if (hours > 8) {
                statusClass = 'status-overdue';
            } else if (hours > 4) {
                statusClass = 'status-warning';
            }
            
            return `
                <tr class="signout-row ${statusClass}">
                    <td>
                        <div class="signout-id">
                            <span class="id-badge">${signout.signout_id}</span>
                        </div>
                    </td>
                    <td>
                        ${Utils.renderSoldierChipsForTable(signout.soldiers || [], signout.soldier_count || 1)}
                    </td>
                    <td>
                        <div class="location-info">
                            <strong>${signout.location}</strong>
                            ${signout.notes ? `<div class="notes">${signout.notes}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="time-info">
                            <div class="sign-out-time">${signOutTime}</div>
                        </div>
                    </td>
                    <td>
                        <div class="duration ${statusClass}">${duration}</div>
                    </td>
                    <td>
                        <div class="signed-by">
                            ${signout.signed_out_by_name}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-sm sign-in-btn" data-signout-id="${signout.signout_id}" data-soldier-names="${signout.soldier_names || 'Unknown'}">
                                Sign In
                            </button>
                            <button class="btn btn-secondary btn-small info-btn" data-signout-id="${signout.signout_id}" title="View Details">
                                <span class="icon">ℹ️</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async loadFilteredLogs() {
        try {
            // Get filter parameters
            const params = new URLSearchParams();
            if (this.startDate?.value) params.append('startDate', this.startDate.value);
            if (this.endDate?.value) params.append('endDate', this.endDate.value);
            if (this.soldierNameFilter?.value) params.append('soldierName', this.soldierNameFilter.value);
            if (this.locationFilter?.value) params.append('location', this.locationFilter.value);
            if (this.statusFilter?.value) params.append('status', this.statusFilter.value);
            
            const response = await Utils.fetchWithAuth(`/api/signouts/logs?${params}`);
            
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            const logs = await response.json();
            this.renderLogsTable(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
            this.notificationManager.showNotification('Failed to load logs', 'error');
        }
    }

    renderLogsTable(logs) {
        const tbody = this.logsTableBody;
        const emptyState = this.logsEmptyState;
        
        if (!logs || logs.length === 0) {
            if (tbody) tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        if (tbody) {
            tbody.innerHTML = logs.map(log => {
                const signOutTime = Utils.formatTime(log.sign_out_time);
                const signInTime = log.sign_in_time ? Utils.formatTime(log.sign_in_time) : 'N/A';
                const duration = log.sign_in_time 
                    ? Utils.calculateDuration(log.sign_out_time, log.sign_in_time)
                    : Utils.calculateDuration(log.sign_out_time);
                
                return `
                    <tr>
                        <td><span class="id-badge">${log.signout_id}</span></td>
                        <td>
                            ${Utils.renderSoldierChipsForTable(log.soldiers, log.soldier_count)}
                        </td>
                        <td>${log.location}</td>
                        <td>${signOutTime}</td>
                        <td>${signInTime}</td>
                        <td>${duration}</td>
                        <td>${log.signed_out_by_name}</td>
                        <td>${log.signed_in_by_name || 'N/A'}</td>
                        <td><span class="status-badge status-${log.status.toLowerCase()}">${log.status}</span></td>
                        <td>${log.notes || ''}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Duration update methods
    startDurationUpdates() {
        console.log('Starting duration updates...');
        // Clear any existing interval
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
        }
        
        // Set up interval to update durations every minute
        this.durationInterval = setInterval(() => {
            console.log('Duration update interval triggered');
            // Only update if we're on the dashboard view and have signouts
            if (this.dashboardView && this.dashboardView.style.display !== 'none' && this.signouts) {
                console.log('Updating durations...');
                this.renderCurrentSignOuts();
            }
        }, 60000); // Update every minute
        
        console.log('Duration update interval set up with ID:', this.durationInterval);
    }

    stopDurationUpdates() {
        console.log('Stopping duration updates...');
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
            console.log('Duration updates stopped');
        }
    }

    // Settings Methods (placeholder implementations)
    async updateMaxDuration() {
        this.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async updateWarningThreshold() {
        this.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async exportAllData() {
        this.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async createBackup() {
        this.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async clearOldRecords() {
        this.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async resetSystem() {
        this.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    // User Management Modal Methods
    async openCreateUserModal() {
        console.log('Opening create user modal');
        if (this.createUserModal) {
            this.createUserModal.style.display = 'flex';
            this.createUserModal.style.visibility = 'visible';
            this.createUserModal.style.opacity = '1';
            this.createUserModal.classList.add('show');
            
            // Reset form
            if (this.createUserForm) {
                this.createUserForm.reset();
            }
            
            // Clear any existing error messages
            if (this.createUserError) {
                this.createUserError.style.display = 'none';
            }
            
            // Focus on first input
            const firstInput = this.createUserForm?.querySelector('input, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeCreateUserModal() {
        console.log('Closing create user modal');
        if (this.createUserModal) {
            this.createUserModal.style.display = 'none';
            this.createUserModal.style.visibility = 'hidden';
            this.createUserModal.style.opacity = '0';
            this.createUserModal.classList.remove('show');
        }
        
        // Reset form and clear errors
        if (this.createUserForm) {
            this.createUserForm.reset();
        }
        if (this.createUserError) {
            this.createUserError.style.display = 'none';
        }
    }

    async handleCreateUser() {
        console.log('Handling create user');
        
        try {
            // Validate form data
            const formData = new FormData(this.createUserForm);
            const userData = {
                rank: formData.get('rank'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                username: formData.get('username'),
                password: formData.get('password'),
                pin: formData.get('pin'),
                confirmPin: formData.get('confirmPin')
            };

            // Validate required fields
            const requiredFields = ['rank', 'firstName', 'lastName', 'username', 'password', 'pin', 'confirmPin'];
            const missingFields = requiredFields.filter(field => !userData[field] || userData[field].trim() === '');
            
            if (missingFields.length > 0) {
                this.showCreateUserError('Please fill in all required fields');
                return;
            }

            // Validate PIN format
            if (!/^\d{4}$/.test(userData.pin)) {
                this.showCreateUserError('PIN must be exactly 4 digits');
                return;
            }

            // Validate PIN confirmation
            if (userData.pin !== userData.confirmPin) {
                this.showCreateUserError('PIN confirmation does not match');
                return;
            }

            // Validate password length
            if (userData.password.length < 6) {
                this.showCreateUserError('Password must be at least 6 characters long');
                return;
            }

            // Show loading state
            Utils.showLoading(true);
            this.submitCreateUser.disabled = true;
            this.submitCreateUser.textContent = 'Creating...';

            // Send request to backend
            const response = await Utils.fetchWithAuth('/api/signouts/auth/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rank: userData.rank,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    username: userData.username,
                    password: userData.password,
                    pin: userData.pin
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create user');
            }

            const result = await response.json();
            
            // Success
            this.closeCreateUserModal();
            this.notificationManager.showNotification('User created successfully', 'success');
            console.log('User created:', result);

        } catch (error) {
            console.error('Error creating user:', error);
            this.showCreateUserError(error.message || 'Failed to create user');
        } finally {
            Utils.showLoading(false);
            this.submitCreateUser.disabled = false;
            this.submitCreateUser.textContent = 'Create User';
        }
    }

    showCreateUserError(message) {
        if (this.createUserError) {
            this.createUserError.textContent = message;
            this.createUserError.style.display = 'block';
        }
    }

    async openChangePinModal() {
        console.log('Opening change PIN modal');
        if (this.changePinModal) {
            this.changePinModal.style.display = 'flex';
            this.changePinModal.style.visibility = 'visible';
            this.changePinModal.style.opacity = '1';
            this.changePinModal.classList.add('show');
            
            // Reset form
            if (this.changePinForm) {
                this.changePinForm.reset();
            }
            
            // Clear any existing error messages
            if (this.changePinError) {
                this.changePinError.style.display = 'none';
            }
            
            // Load users into the select dropdown
            await this.loadUsersForChangePin();
            
            // Focus on first input
            const firstInput = this.changePinForm?.querySelector('select, input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeChangePinModal() {
        console.log('Closing change PIN modal');
        if (this.changePinModal) {
            this.changePinModal.style.display = 'none';
            this.changePinModal.style.visibility = 'hidden';
            this.changePinModal.style.opacity = '0';
            this.changePinModal.classList.remove('show');
        }
        
        // Reset form and clear errors
        if (this.changePinForm) {
            this.changePinForm.reset();
        }
        if (this.changePinError) {
            this.changePinError.style.display = 'none';
        }
    }

    async loadUsersForChangePin() {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const users = await response.json();
            
            if (this.changePinUser) {
                this.changePinUser.innerHTML = `
                    <option value="">Select a user</option>
                    ${users.map(user => `
                        <option value="${user.id}">${user.rank} ${user.full_name}</option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Error loading users for PIN change:', error);
            this.showChangePinError('Failed to load users');
        }
    }

    async handleChangePin() {
        console.log('Handling change PIN');
        
        try {
            // Validate form data
            const formData = new FormData(this.changePinForm);
            const changePinData = {
                userId: formData.get('userId'),
                currentPin: formData.get('currentPin'),
                newPin: formData.get('newPin'),
                confirmNewPin: formData.get('confirmNewPin')
            };

            // Validate required fields
            const requiredFields = ['userId', 'currentPin', 'newPin', 'confirmNewPin'];
            const missingFields = requiredFields.filter(field => !changePinData[field] || changePinData[field].trim() === '');
            
            if (missingFields.length > 0) {
                this.showChangePinError('Please fill in all required fields');
                return;
            }

            // Validate PIN format
            if (!/^\d{4}$/.test(changePinData.currentPin)) {
                this.showChangePinError('Current PIN must be exactly 4 digits');
                return;
            }

            if (!/^\d{4}$/.test(changePinData.newPin)) {
                this.showChangePinError('New PIN must be exactly 4 digits');
                return;
            }

            // Validate PIN confirmation
            if (changePinData.newPin !== changePinData.confirmNewPin) {
                this.showChangePinError('New PIN confirmation does not match');
                return;
            }

            // Check if new PIN is different from current PIN
            if (changePinData.currentPin === changePinData.newPin) {
                this.showChangePinError('New PIN must be different from current PIN');
                return;
            }

            // Show loading state
            Utils.showLoading(true);
            this.submitChangePin.disabled = true;
            this.submitChangePin.textContent = 'Changing...';

            // Send request to backend
            const response = await Utils.fetchWithAuth(`/api/signouts/auth/users/${changePinData.userId}/pin`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPin: changePinData.currentPin,
                    newPin: changePinData.newPin,
                    confirmNewPin: changePinData.confirmNewPin
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to change PIN');
            }

            const result = await response.json();
            
            // Success
            this.closeChangePinModal();
            this.notificationManager.showNotification('PIN changed successfully', 'success');
            console.log('PIN changed:', result);

        } catch (error) {
            console.error('Error changing PIN:', error);
            this.showChangePinError(error.message || 'Failed to change PIN');
        } finally {
            Utils.showLoading(false);
            this.submitChangePin.disabled = false;
            this.submitChangePin.textContent = 'Change PIN';
        }
    }

    showChangePinError(message) {
        if (this.changePinError) {
            this.changePinError.textContent = message;
            this.changePinError.style.display = 'block';
        }
    }
}

// Ensure the SoldierSignOutApp class is instantiated
const app = new SoldierSignOutApp();
window.app = app; // Make globally accessible for debugging