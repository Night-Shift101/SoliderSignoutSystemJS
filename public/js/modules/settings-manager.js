class SettingsManager {
    constructor(app) {
        this.app = app;
    }

    async loadSettingsData() {
        console.log('Loading settings data...');
        
        try {
            // Load current user display
            const currentUserDisplay = this.app.domManager.get('currentUserDisplay');
            if (currentUserDisplay && this.app.currentUser) {
                currentUserDisplay.textContent = `${this.app.currentUser.rank} ${this.app.currentUser.full_name}`;
            }
            
            // Load other settings if needed
            await this.loadAccountsList();
            
        } catch (error) {
            console.error('Error loading settings data:', error);
            this.app.notificationManager.showNotification('Failed to load settings', 'error');
        }
    }

    async loadAccountsList() {
        try {
            const accountsTableBody = this.app.domManager.get('accountsTableBody');
            const accountsEmptyState = this.app.domManager.get('accountsEmptyState');
            
            if (!accountsTableBody) {
                console.log('Accounts table body not found');
                return;
            }

            const response = await Utils.fetchWithAuth('/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const users = await response.json();
            
            if (!users || users.length === 0) {
                accountsTableBody.innerHTML = '';
                if (accountsEmptyState) accountsEmptyState.style.display = 'block';
                return;
            }
            
            if (accountsEmptyState) accountsEmptyState.style.display = 'none';
            
            accountsTableBody.innerHTML = users.map(user => {
                const isCurrentUser = this.app.currentUser && this.app.currentUser.id === user.id;
                const statusClass = user.is_active ? 'status-active' : 'status-inactive';
                const statusText = user.is_active ? 'Active' : 'Inactive';
                
                return `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.rank}</td>
                        <td>${user.full_name}</td>
                        <td>${user.role || 'User'}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-secondary change-pin-btn" 
                                        data-user-id="${user.id}" 
                                        data-user-name="${user.rank} ${user.full_name}"
                                        ${isCurrentUser ? 'disabled' : ''}>
                                    Change PIN
                                </button>
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
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading accounts list:', error);
            this.app.notificationManager.showNotification('Failed to load user accounts', 'error');
        }
    }

    async updateMaxDuration() {
        this.app.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async updateWarningThreshold() {
        this.app.notificationManager.showNotification('Feature not implemented yet', 'info');
    }

    async exportAllData() {
        try {
            Utils.showLoading(true);
            
            const response = await Utils.fetchWithAuth('/api/signouts/export/all');
            
            if (!response.ok) throw new Error('Failed to export data');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all-signout-data-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.app.notificationManager.showNotification('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.app.notificationManager.showNotification('Failed to export data', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createBackup() {
        try {
            Utils.showLoading(true);
            
            const response = await Utils.fetchWithAuth('/api/signouts/backup', {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to create backup');
            
            const result = await response.json();
            this.app.notificationManager.showNotification(`Backup created: ${result.filename}`, 'success');
            
        } catch (error) {
            console.error('Error creating backup:', error);
            this.app.notificationManager.showNotification('Failed to create backup', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async clearOldRecords() {
        const confirmed = confirm('Are you sure you want to clear old records? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            Utils.showLoading(true);
            
            const response = await Utils.fetchWithAuth('/api/signouts/cleanup', {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to clear old records');
            
            const result = await response.json();
            this.app.notificationManager.showNotification(`Cleared ${result.deletedCount} old records`, 'success');
            
        } catch (error) {
            console.error('Error clearing old records:', error);
            this.app.notificationManager.showNotification('Failed to clear old records', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async resetSystem() {
        const confirmed = confirm('⚠️ WARNING: This will reset the entire system and delete ALL data. This action cannot be undone. Are you absolutely sure?');
        if (!confirmed) return;
        
        const doubleConfirmed = confirm('This is your final warning. All sign-out records, user accounts, and system data will be permanently deleted. Type "RESET" in the next prompt to confirm.');
        if (!doubleConfirmed) return;
        
        const resetConfirmation = prompt('Type "RESET" to confirm system reset:');
        if (resetConfirmation !== 'RESET') {
            this.app.notificationManager.showNotification('System reset cancelled', 'info');
            return;
        }
        
        try {
            Utils.showLoading(true);
            
            const response = await Utils.fetchWithAuth('/api/signouts/reset', {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to reset system');
            
            this.app.notificationManager.showNotification('System reset successfully. Redirecting to login...', 'success');
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            
        } catch (error) {
            console.error('Error resetting system:', error);
            this.app.notificationManager.showNotification('Failed to reset system', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
}

export default SettingsManager;
