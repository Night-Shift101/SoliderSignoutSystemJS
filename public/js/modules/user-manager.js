class UserManager {
    constructor(app) {
        this.app = app;
    }

    async loadUsers() {
        try {
            const usersList = this.app.domManager.get('usersList');
            if (usersList) {
                usersList.innerHTML = '<div class="users-loading">Loading users...</div>';
            }
            
            const response = await Utils.fetchWithAuth('/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const users = await response.json();
            this.renderUsersList(users);
        } catch (error) {
            console.error('Error loading users:', error);
            const usersList = this.app.domManager.get('usersList');
            if (usersList) {
                usersList.innerHTML = '<div class="users-error">Failed to load users</div>';
            }
        }
    }

    renderUsersList(users) {
        const usersList = this.app.domManager.get('usersList');
        if (!usersList) return;

        if (!users || users.length === 0) {
            usersList.innerHTML = '<div class="users-error">No users found</div>';
            return;
        }

        usersList.innerHTML = users.map(user => {
            const isCurrent = this.app.currentUser && this.app.currentUser.id === user.id;
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

        usersList.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.userId);
                const user = users.find(u => u.id === userId);
                if (user && user.id !== this.app.currentUser?.id) {
                    this.app.authManager.promptUserSwitch(user);
                }
                this.app.viewManager.closeUserSelector();
            });
        });
    }

    async handleAddUser() {
        console.log('Handling add user');
        
        // Check permissions
        if (!this.app.permissionsManager?.canManageUsers()) {
            this.app.permissionsManager?.showPermissionDenied('add users');
            return;
        }
        
        try {
            const addUserForm = this.app.domManager.get('addUserForm');
            const submitAddUser = this.app.domManager.get('submitAddUser');
            
            const formData = new FormData(addUserForm);
            const userData = {
                rank: formData.get('rank'),
                lastName: formData.get('lastName'),
                pin: formData.get('pin'),
                confirmPin: formData.get('confirmPin')
            };

            const requiredFields = ['rank', 'lastName', 'pin', 'confirmPin'];
            const missingFields = requiredFields.filter(field => !userData[field] || userData[field].trim() === '');
            
            if (missingFields.length > 0) {
                this.showAddUserError(`Please fill in all required fields: ${missingFields.join(', ')}`);
                return;
            }

            if (!/^\d{4,}$/.test(userData.pin)) {
                this.showAddUserError('PIN must be at least 4 digits');
                return;
            }

            if (userData.pin !== userData.confirmPin) {
                this.showAddUserError('PINs do not match');
                return;
            }

            Utils.showLoading(true);
            if (submitAddUser) {
                submitAddUser.disabled = true;
                submitAddUser.textContent = 'Creating...';
            }

            const response = await Utils.fetchWithAuth('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rank: userData.rank,
                    lastName: userData.lastName,
                    pin: userData.pin
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create user');
            }

            const result = await response.json();
            
            this.app.modalManager.closeAddUserModal();
            this.app.settingsManager.reloadAccountsList();
            this.app.notificationManager.showNotification('User created successfully', 'success');
            console.log('User created:', result);

        } catch (error) {
            console.error('Error creating user:', error);
            this.showAddUserError(error.message || 'Failed to create user');
        } finally {
            Utils.showLoading(false);
            const submitAddUser = this.app.domManager.get('submitAddUser');
            if (submitAddUser) {
                submitAddUser.disabled = false;
                submitAddUser.textContent = 'Add User';
            }
        }
    }

    showAddUserError(message) {
        const addUserError = this.app.domManager.get('addUserError');
        if (addUserError) {
            addUserError.textContent = message;
            addUserError.style.display = 'block';
        }
    }

    async handleChangePin() {
        console.log('Handling change PIN');
        
        // Check permissions
        if (!this.app.permissionsManager?.canChangePins()) {
            this.app.permissionsManager?.showPermissionDenied('change user PINs');
            return;
        }
        
        try {
            const changePinForm = this.app.domManager.get('changePinForm');
            const submitChangePin = this.app.domManager.get('submitChangePin');
            
            const formData = new FormData(changePinForm);
            const changePinData = {
                userId: formData.get('userId'),
                systemPassword: formData.get('systemPassword'),
                newPin: formData.get('newPin'),
                confirmNewPin: formData.get('confirmNewPin')
            };

            const requiredFields = ['userId', 'systemPassword', 'newPin', 'confirmNewPin'];
            const missingFields = requiredFields.filter(field => !changePinData[field] || changePinData[field].trim() === '');
            
            if (missingFields.length > 0) {
                this.showChangePinError('Please fill in all required fields');
                return;
            }

            if (!/^\d{4,}$/.test(changePinData.newPin)) {
                this.showChangePinError('PIN must be at least 4 digits');
                return;
            }

            if (changePinData.newPin !== changePinData.confirmNewPin) {
                this.showChangePinError('PINs do not match');
                return;
            }

            Utils.showLoading(true);
            if (submitChangePin) {
                submitChangePin.disabled = true;
                submitChangePin.textContent = 'Changing...';
            }

            const response = await Utils.fetchWithAuth(`/api/users/${changePinData.userId}/pin`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPassword: changePinData.systemPassword,
                    newPin: changePinData.newPin
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to change PIN');
            }

            this.app.modalManager.closeChangePinModal();
            this.app.notificationManager.showNotification('PIN changed successfully', 'success');
            this.app.settingsManager.reloadAccountsList();

        } catch (error) {
            console.error('Error changing PIN:', error);
            this.showChangePinError(error.message || 'Failed to change PIN');
        } finally {
            Utils.showLoading(false);
            const submitChangePin = this.app.domManager.get('submitChangePin');
            if (submitChangePin) {
                submitChangePin.disabled = false;
                submitChangePin.textContent = 'Change PIN';
            }
        }
    }

    showChangePinError(message) {
        const changePinError = this.app.domManager.get('changePinError');
        if (changePinError) {
            changePinError.textContent = message;
            changePinError.style.display = 'block';
        }
    }

    async handleDeleteUser() {
        console.log('Handling delete user');
        
        // Check permissions
        if (!this.app.permissionsManager?.canManageUsers()) {
            this.app.permissionsManager?.showPermissionDenied('delete users');
            return;
        }
        
        try {
            const deleteUserForm = this.app.domManager.get('deleteUserForm');
            const submitDeleteUser = this.app.domManager.get('submitDeleteUser');
            
            const formData = new FormData(deleteUserForm);
            const deleteData = {
                userId: formData.get('userId'),
                systemPassword: formData.get('systemPassword')
            };

            if (!deleteData.systemPassword || deleteData.systemPassword.trim() === '') {
                this.showDeleteUserError('Please enter the system password');
                return;
            }

            Utils.showLoading(true);
            if (submitDeleteUser) {
                submitDeleteUser.disabled = true;
                submitDeleteUser.textContent = 'Deleting...';
            }

            const response = await Utils.fetchWithAuth(`/api/users/${deleteData.userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPassword: deleteData.systemPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }

            this.app.modalManager.closeDeleteUserModal();
            this.app.settingsManager.reloadAccountsList();
            this.app.notificationManager.showNotification('User deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showDeleteUserError(error.message || 'Failed to delete user');
        } finally {
            Utils.showLoading(false);
            const submitDeleteUser = this.app.domManager.get('submitDeleteUser');
            if (submitDeleteUser) {
                submitDeleteUser.disabled = false;
                submitDeleteUser.textContent = 'Delete User';
            }
        }
    }

    showDeleteUserError(message) {
        const deleteUserError = this.app.domManager.get('deleteUserError');
        if (deleteUserError) {
            deleteUserError.textContent = message;
            deleteUserError.style.display = 'block';
        }
    }

    async handleActivateUser(userId, userName) {
        // Check permissions
        if (!this.app.permissionsManager?.canManageUsers()) {
            this.app.permissionsManager?.showPermissionDenied('activate users');
            return;
        }
        
        try {
            const response = await Utils.fetchWithAuth(`/api/users/${userId}/activate`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                throw new Error('Failed to activate user');
            }

            this.app.settingsManager.reloadAccountsList();
            this.app.notificationManager.showNotification(`${userName} activated successfully`, 'success');
        } catch (error) {
            console.error('Error activating user:', error);
            this.app.notificationManager.showNotification('Failed to activate user', 'error');
        }
    }

    async handleDeactivateUser(userId, userName) {
        // Check permissions
        if (!this.app.permissionsManager?.canManageUsers()) {
            this.app.permissionsManager?.showPermissionDenied('deactivate users');
            return;
        }
        
        try {
            const response = await Utils.fetchWithAuth(`/api/users/${userId}/deactivate`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                throw new Error('Failed to deactivate user');
            }

            this.app.settingsManager.reloadAccountsList();
            this.app.notificationManager.showNotification(`${userName} deactivated successfully`, 'success');
        } catch (error) {
            console.error('Error deactivating user:', error);
            this.app.notificationManager.showNotification('Failed to deactivate user', 'error');
        }
    }

    async handleChangeAdminCredentials() {
        console.log('Handling change admin credentials');
        
        try {
            const changeAdminCredentialsForm = this.app.domManager.get('changeAdminCredentialsForm');
            const submitChangeAdminCredentials = this.app.domManager.get('submitChangeAdminCredentials');
            
            const formData = new FormData(changeAdminCredentialsForm);
            const credentialsData = {
                currentPassword: formData.get('currentPassword'),
                newPassword: formData.get('newPassword'),
                newPin: formData.get('newPin')
            };

            if (!credentialsData.currentPassword || credentialsData.currentPassword.trim() === '') {
                this.showChangeAdminCredentialsError('Please enter your current password');
                return;
            }

            if (!credentialsData.newPassword || credentialsData.newPassword.trim() === '') {
                this.showChangeAdminCredentialsError('Please enter a new password');
                return;
            }

            if (!credentialsData.newPin || credentialsData.newPin.trim() === '') {
                this.showChangeAdminCredentialsError('Please enter a new PIN');
                return;
            }

            if (credentialsData.newPassword.length < 6) {
                this.showChangeAdminCredentialsError('New password must be at least 6 characters');
                return;
            }

            if (credentialsData.newPin.length < 4) {
                this.showChangeAdminCredentialsError('New PIN must be at least 4 characters');
                return;
            }

            Utils.showLoading(true);
            if (submitChangeAdminCredentials) {
                submitChangeAdminCredentials.disabled = true;
                submitChangeAdminCredentials.textContent = 'Updating...';
            }

            const response = await Utils.fetchWithAuth('/api/users/admin/credentials', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentialsData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update admin credentials');
            }

            this.app.modalManager.closeChangeAdminCredentialsModal();
            this.app.notificationManager.showNotification('Admin credentials updated successfully', 'success');

        } catch (error) {
            console.error('Error updating admin credentials:', error);
            this.showChangeAdminCredentialsError(error.message || 'Failed to update admin credentials');
        } finally {
            Utils.showLoading(false);
            const submitChangeAdminCredentials = this.app.domManager.get('submitChangeAdminCredentials');
            if (submitChangeAdminCredentials) {
                submitChangeAdminCredentials.disabled = false;
                submitChangeAdminCredentials.textContent = 'Update Credentials';
            }
        }
    }

    showChangeAdminCredentialsError(message) {
        const changeAdminCredentialsError = this.app.domManager.get('changeAdminCredentialsError');
        if (changeAdminCredentialsError) {
            changeAdminCredentialsError.textContent = message;
            changeAdminCredentialsError.style.display = 'block';
        }
    }

    async loadAccountsList() {
        // This method would load the accounts table in settings
        // Implementation would depend on the existing settings structure
        console.log('Loading accounts list...');
    }

    async handleManagePermissions() {
        console.log('Handling manage permissions');
        
        try {
            const modal = this.app.domManager.get('managePermissionsModal');
            const userId = parseInt(modal.dataset.userId);
            const submitButton = this.app.domManager.get('submitManagePermissions');
            
            if (!userId) {
                this.app.modalManager.showManagePermissionsError('Invalid user ID');
                return;
            }

            // Get selected permissions
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
            const selectedPermissions = Array.from(checkboxes).map(cb => cb.value);

            Utils.showLoading(true);
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.querySelector('.btn-text').textContent = 'Updating...';
            }

            // Update permissions
            await this.app.permissionsManager.updateUserPermissions(userId, selectedPermissions);

            this.app.modalManager.closeManagePermissionsModal();
            this.app.settingsManager.reloadAccountsList();
            this.app.notificationManager.showNotification('Permissions updated successfully', 'success');

        } catch (error) {
            console.error('Error updating permissions:', error);
            this.app.modalManager.showManagePermissionsError(error.message || 'Failed to update permissions');
        } finally {
            Utils.showLoading(false);
            const submitButton = this.app.domManager.get('submitManagePermissions');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.querySelector('.btn-text').textContent = 'Update Permissions';
            }
        }
    }
}

export default UserManager;
