class PermissionsManager {
    constructor(app) {
        this.app = app;
        this.userPermissions = [];
        this.permissionsLoaded = false;
    }

    /**
     * Load permissions for the current user
     */
    async loadUserPermissions() {
        try {
            if (!this.app.currentUser) {
                console.warn('No current user found, cannot load permissions');
                return [];
            }

            const response = await Utils.fetchWithAuth(`/api/permissions/user/${this.app.currentUser.id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user permissions');
            }

            const result = await response.json();
            if (result.success) {
                this.userPermissions = result.permissions || [];
                this.permissionsLoaded = true;
                console.log('User permissions loaded:', this.userPermissions);
                return this.userPermissions;
            } else {
                throw new Error(result.error || 'Failed to load permissions');
            }
        } catch (error) {
            console.error('Error loading user permissions:', error);
            this.userPermissions = [];
            this.permissionsLoaded = false;
            return [];
        }
    }

    /**
     * Check if user has specific permission
     * @param {string} permission - Permission name
     * @returns {boolean}
     */
    hasPermission(permission) {
        if (!this.permissionsLoaded) {
            console.warn('Permissions not loaded yet');
            return false;
        }
        return this.userPermissions.includes(permission);
    }

    /**
     * Check if user has ALL specified permissions
     * @param {Array<string>} permissions - Array of permission names
     * @returns {boolean}
     */
    hasAllPermissions(permissions) {
        if (!this.permissionsLoaded) {
            console.warn('Permissions not loaded yet');
            return false;
        }
        return permissions.every(permission => this.userPermissions.includes(permission));
    }

    /**
     * Check if user has ANY of the specified permissions
     * @param {Array<string>} permissions - Array of permission names
     * @returns {boolean}
     */
    hasAnyPermission(permissions) {
        if (!this.permissionsLoaded) {
            console.warn('Permissions not loaded yet');
            return false;
        }
        return permissions.some(permission => this.userPermissions.includes(permission));
    }

    /**
     * Check if user is admin (has system_admin permission)
     * @returns {boolean}
     */
    isAdmin() {
        return this.hasPermission('system_admin');
    }

    /**
     * Check if user can manage users
     * @returns {boolean}
     */
    canManageUsers() {
        return this.hasPermission('manage_users') || this.isAdmin();
    }

    /**
     * Check if user can change PINs
     * @returns {boolean}
     */
    canChangePins() {
        return this.hasPermission('change_user_pins') || this.isAdmin();
    }

    /**
     * Check if user can manage permissions
     * @returns {boolean}
     */
    canManagePermissions() {
        return this.hasPermission('manage_permissions') || this.isAdmin();
    }

    /**
     * Check if user can view settings
     * @returns {boolean}
     */
    canViewSettings() {
        return this.hasPermission('view_settings') || this.isAdmin();
    }

    /**
     * Get all available permissions
     */
    async getAllPermissions() {
        try {
            const response = await Utils.fetchWithAuth('/api/permissions');
            if (!response.ok) {
                throw new Error('Failed to fetch permissions');
            }

            const result = await response.json();
            if (result.success) {
                return result.permissions || [];
            } else {
                throw new Error(result.error || 'Failed to load permissions');
            }
        } catch (error) {
            console.error('Error loading all permissions:', error);
            return [];
        }
    }

    /**
     * Update permissions for a user
     * @param {number} userId - User ID
     * @param {Array<string>} permissions - Array of permission names
     */
    async updateUserPermissions(userId, permissions) {
        try {
            const response = await Utils.fetchWithAuth('/api/permissions/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    permissions: permissions,
                    grantedBy: this.app.currentUser.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update permissions');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to update permissions');
            }

            return result;
        } catch (error) {
            console.error('Error updating user permissions:', error);
            throw error;
        }
    }

    /**
     * Apply permission-based visibility to elements
     */
    applyPermissionBasedVisibility() {
        // Hide/show elements based on permissions
        const elementsToCheck = [
            { selector: '#addUserBtn', permission: 'manage_users' },
            { selector: '.change-pin-btn', permission: 'change_user_pins' },
            { selector: '.delete-user-btn', permission: 'manage_users' },
            { selector: '.activate-user-btn', permission: 'manage_users' },
            { selector: '.deactivate-user-btn', permission: 'manage_users' },
            { selector: '#newSignOutBtn', permission: 'create_signout' },
            { selector: '#settingsBtn', permission: 'view_settings' },
            { selector: '#logsBtn', permission: 'view_logs' },
            { selector: '#exportCsvBtn', permission: 'export_data' },
            { selector: '#exportLogsPdfBtn', permission: 'export_data' }
        ];

        elementsToCheck.forEach(({ selector, permission }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const hasAccess = this.hasPermission(permission) || this.isAdmin();
                if (hasAccess) {
                    element.style.display = '';
                    element.disabled = false;
                } else {
                    element.style.display = 'none';
                }
            });
        });

        // Special cases for admin-only elements
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        adminOnlyElements.forEach(element => {
            if (this.isAdmin()) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Show permission denied message
     * @param {string} action - Action that was denied
     */
    showPermissionDenied(action = 'perform this action') {
        this.app.notificationManager.showNotification(
            `You don't have permission to ${action}`, 
            'error'
        );
    }
}

export default PermissionsManager;
