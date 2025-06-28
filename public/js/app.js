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
        // User info
        this.userInfo = document.getElementById('userInfo');
        
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
    }

    async checkAuthentication() {
        try {
            // Prevent redirect loop - don't redirect if we're already on login page
            if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
                console.log('Already on login page, skipping auth check');
                return;
            }
            
            console.log('Checking authentication...');
            const response = await Utils.fetchWithAuth('/api/signouts/auth/check');
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
                        window.location.href = '/login';
                    }, 100);
                }
                return;
            }
            
            console.log('Authentication successful');
            this.currentUser = result.user;
            this.userInfo.textContent = `${result.user.rank} ${result.user.full_name}`;
            this.attachEventListeners();
            this.loadCurrentSignOuts();
            this.startDurationUpdates();
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            // Prevent redirect loop
            if (window.location.pathname !== '/login' && window.location.pathname !== '/login.html') {
                if (!window.location.href.includes('/login')) {
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 100);
                }
            }
        }
    }

    attachEventListeners() {
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
        this.changeUserBtn?.addEventListener('click', () => this.changeUser());
        this.logoutBtn?.addEventListener('click', () => this.logout());
        this.backToDashboard?.addEventListener('click', () => this.showDashboardView());
        this.backToMainBtn?.addEventListener('click', () => this.showDashboardView());
        
        // Modal events
        this.closeModal?.addEventListener('click', () => this.closeNewSignOutModal());
        this.cancelBtn?.addEventListener('click', () => this.closeNewSignOutModal());
        this.signOutForm?.addEventListener('submit', (e) => this.handleSignOut(e));
        
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
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.signOutModal) this.closeNewSignOutModal();
            if (e.target === this.pinModal) this.closePinModal();
            if (e.target === this.infoModal) this.closeInfoModal();
        });
        
        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sign-in-btn')) {
                const button = e.target.closest('.sign-in-btn');
                const signoutId = button.dataset.signoutId;
                const soldierNames = button.dataset.soldierNames;
                this.promptSignIn(signoutId, soldierNames);
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
            const response = await Utils.fetchWithAuth('/api/signouts/auth/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            
            if (!response.ok) {
                throw new Error('Invalid PIN');
            }
            
            const result = await response.json();
            
            if (result.success) {
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

    async processSignIn(pin) {
        // Regular sign-in processing logic
        if (!this.currentSignOutId) {
            this.showPinError('No sign-out selected');
            return;
        }
        
        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${this.currentSignOutId}/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            
            if (!response.ok) {
                throw new Error('Sign-in failed');
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.closePinModal();
                this.loadCurrentSignOuts();
                this.notificationManager.showNotification('Sign-in successful', 'success');
            } else {
                this.showPinError(result.message || 'Sign-in failed');
            }
        } catch (error) {
            console.error('Sign-in error:', error);
            this.showPinError('Sign-in failed');
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
    }

    showPinError(message) {
        if (this.pinError) {
            this.pinError.textContent = message;
            this.pinError.style.display = 'block';
        }
    }

    promptSignIn(signoutId, soldierNames) {
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
        
        // Update soldier info
        const soldierInfo = this.pinModal?.querySelector('#soldierInfo');
        if (soldierInfo) {
            soldierInfo.textContent = `Signing in: ${soldierNames}`;
        }
        
        if (this.pinInput) {
            this.pinInput.value = '';
            this.pinInput.focus();
        }
        
        if (this.pinError) {
            this.pinError.style.display = 'none';
        }
    }

    async changeUser() {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                localStorage.clear();
                window.location.href = '/login';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Change user error:', error);
            this.notificationManager.showNotification('Failed to change user', 'error');
        }
    }

    async logout() {
        try {
            const response = await Utils.fetchWithAuth('/api/signouts/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                localStorage.clear();
                window.location.href = '/login';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.notificationManager.showNotification('Failed to logout', 'error');
        }
    }

    // Info Modal Management
    async showSignOutInfo(signoutId) {
        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${signoutId}`);
            if (!response.ok) throw new Error('Failed to fetch sign-out details');
            
            const signout = await response.json();
            
            const signOutTime = Utils.formatTime(signout.sign_out_time);
            const signInTime = signout.sign_in_time ? Utils.formatTime(signout.sign_in_time) : 'Not signed in';
            const duration = signout.sign_in_time 
                ? Utils.calculateDuration(signout.sign_out_time, signout.sign_in_time)
                : Utils.calculateDuration(signout.sign_out_time);
            
            const soldierChips = Utils.renderSoldierChips(signout.soldiers);
            
            const content = `
                <div class="info-section">
                    <h3>Sign-Out Details</h3>
                    <div class="info-row">
                        <span class="info-label">ID:</span>
                        <span class="info-value">${signout.signout_id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Soldiers:</span>
                        <div class="info-value">${soldierChips}</div>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Location:</span>
                        <span class="info-value">${signout.location}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Sign-Out Time:</span>
                        <span class="info-value">${signOutTime}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Sign-In Time:</span>
                        <span class="info-value">${signInTime}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Duration:</span>
                        <span class="info-value">${duration}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Signed Out By:</span>
                        <span class="info-value">${signout.signed_out_by_name}</span>
                    </div>
                    ${signout.signed_in_by_name ? `
                    <div class="info-row">
                        <span class="info-label">Signed In By:</span>
                        <span class="info-value">${signout.signed_in_by_name}</span>
                    </div>
                    ` : ''}
                    ${signout.notes ? `
                    <div class="info-row">
                        <span class="info-label">Notes:</span>
                        <span class="info-value">${signout.notes}</span>
                    </div>
                    ` : ''}
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
    }

    async handleSignOut(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(this.signOutForm);
            const signOutData = {
                soldiers: JSON.parse(formData.get('soldiers') || '[]'),
                location: formData.get('location'),
                notes: formData.get('notes') || ''
            };
            
            if (!signOutData.soldiers || signOutData.soldiers.length === 0) {
                this.notificationManager.showNotification('Please select at least one soldier', 'warning');
                return;
            }
            
            if (!signOutData.location) {
                this.notificationManager.showNotification('Please enter a location', 'warning');
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
            this.loadCurrentSignOuts();
            this.notificationManager.showNotification('Sign-out created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating sign-out:', error);
            this.notificationManager.showNotification('Failed to create sign-out', 'error');
        } finally {
            Utils.showLoading(false);
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

    // ...existing code...
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize the app if we're not on the login page
    if (window.location.pathname !== '/login' && window.location.pathname !== '/login.html') {
        app = new SoldierSignOutApp();
    }
});
