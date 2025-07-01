class SettingsManager {
    constructor(app) {
        this.app = app;
    }

    async loadSettingsData() {
        console.log('Loading settings data...');
        
        try {
            const currentUserDisplay = this.app.domManager.get('currentUserDisplay');
            if (currentUserDisplay && this.app.currentUser) {
                currentUserDisplay.textContent = `${this.app.currentUser.rank} ${this.app.currentUser.full_name}`;
            }
            
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
    

    async reloadAccountsList() {
        await this.loadAccountsList();
    }
}

export default SettingsManager;
