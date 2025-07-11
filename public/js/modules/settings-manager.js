class SettingsManager {
    constructor(app) {
        this.app = app;
    }

    async loadSettingsData() {
        try {
            const currentUserDisplay = this.app.domManager.get('currentUserDisplay');
            if (currentUserDisplay && this.app.currentUser) {
                currentUserDisplay.textContent = `${this.app.currentUser.rank} ${this.app.currentUser.full_name}`;
            }
            
            await this.loadAccountsList();
            
            // Reapply permission-based visibility after settings load
            if (this.app.permissionsManager) {
                this.app.permissionsManager.applyPermissionBasedVisibility();
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.app.notificationManager.showNotification('Failed to load settings', 'error');
        }
    }

    async loadAccountsList() {
        try {
            const accountsTableBody = this.app.domManager.get('accountsTableBody');
            const accountsEmptyState = this.app.domManager.get('accountsEmptyState');
            
            if (!accountsTableBody) {
                return;
            }

            const response = await Utils.fetchWithAuth('/api/users');
            
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            
            const users = await response.json();
            
            if (!users || users.length === 0) {
                accountsTableBody.innerHTML = '';
                if (accountsEmptyState) accountsEmptyState.style.display = 'block';
                return;
            }
            
            if (accountsEmptyState) accountsEmptyState.style.display = 'none';
            
            accountsTableBody.innerHTML = users.map(user => {
                const isCurrentUser = this.app.currentUser && this.app.currentUser.id === user.id;
                const isAdminUser = user.username === 'admin';
                const statusClass = user.is_active ? 'status-active' : 'status-inactive';
                const statusText = user.is_active ? 'Active' : 'Inactive';
                
                // Check permissions
                const canChangePins = this.app.permissionsManager?.canChangePins() || false;
                const canManageUsers = this.app.permissionsManager?.canManageUsers() || false;
                const canManagePermissions = this.app.permissionsManager?.canManagePermissions() || false;
                const isSystemAdmin = this.app.permissionsManager?.isAdmin() || false;
                
                return `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.rank}</td>
                        <td>${user.full_name}</td>
                        <td>${user.role || (user.username === 'admin' ? 'Admin' : 'User')}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                ${isAdminUser ? `
                                    ${isSystemAdmin ? `
                                        <button class="btn btn-sm btn-primary change-admin-credentials-btn" 
                                                data-user-id="${user.id}">
                                            Change Credentials
                                        </button>
                                    ` : ''}
                                ` : `
                                    ${canChangePins ? `
                                        <button class="btn btn-sm btn-secondary change-pin-btn" 
                                                data-user-id="${user.id}" 
                                                data-user-name="${user.rank} ${user.full_name}"
                                                ${isCurrentUser ? 'disabled' : ''}>
                                            Change PIN
                                        </button>
                                    ` : ''}
                                    ${canManagePermissions ? `
                                        <button class="btn btn-sm btn-info manage-permissions-btn" 
                                                data-user-id="${user.id}" 
                                                data-user-name="${user.rank} ${user.full_name}">
                                            Permissions
                                        </button>
                                    ` : ''}
                                    ${canManageUsers ? `
                                        ${user.is_active ? `
                                            <button class="btn btn-sm btn-warning deactivate-user-btn" 
                                                    data-user-id="${user.id}" 
                                                    data-user-name="${user.rank} ${user.full_name}"
                                                    ${isCurrentUser ? 'disabled' : ''}>
                                                Deactivate
                                            </button>
                                        ` : `
                                            <button class="btn btn-sm btn-success activate-user-btn" 
                                                    data-user-id="${user.id}" 
                                                    data-user-name="${user.rank} ${user.full_name}">
                                                Activate
                                            </button>
                                        `}
                                        <button class="btn btn-sm btn-danger delete-user-btn" 
                                                data-user-id="${user.id}" 
                                                data-user-name="${user.rank} ${user.full_name}"
                                                ${isCurrentUser ? 'disabled' : ''}>
                                            Delete
                                        </button>
                                    ` : ''}
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Reapply permission-based visibility after loading accounts
            setTimeout(() => {
                if (this.app.permissionsManager) {
                    this.app.permissionsManager.applyPermissionBasedVisibility();
                }
            }, 100);
            
        } catch (error) {
            console.error('Error loading user accounts:', error);
            this.app.notificationManager.showNotification('Failed to load user accounts', 'error');
        }
    }
    

    async reloadAccountsList() {
        await this.loadAccountsList();
    }
}

export default SettingsManager;
