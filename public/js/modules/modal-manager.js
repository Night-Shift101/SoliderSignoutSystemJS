class ModalManager {
    constructor(app) {
        this.app = app;
    }

    // PIN Modal Management
    async handleSignIn() {
        const pinInput = this.app.domManager.get('pinInput');
        const pin = pinInput?.value;
        
        if (!pin) {
            this.showPinError('Please enter a PIN');
            return;
        }
        
        try {
            const pinModal = this.app.domManager.get('pinModal');
            if (pinModal?.dataset.purpose === 'settings') {
                await this.app.authManager.authenticateForSettings(pin);
            } else if (pinModal?.dataset.purpose === 'user-switch') {
                await this.app.authManager.authenticateUserSwitch(pin);
            } else {
                await this.app.authManager.processSignIn(pin);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.showPinError('Authentication failed');
        }
    }

    async promptSignIn(signoutId, soldierNames) {
        // Check permissions
        if (!this.app.permissionsManager?.hasPermission('sign_in_soldiers')) {
            this.app.permissionsManager?.showPermissionDenied('sign soldiers back in');
            return;
        }
        
        this.app.currentSignOutId = signoutId;
        
        const pinModal = this.app.domManager.get('pinModal');
        if (pinModal) {
            pinModal.style.display = 'flex';
            pinModal.style.visibility = 'visible';
            pinModal.style.opacity = '1';
            pinModal.classList.add('show');
        }
        
        this.resetPinModalState();
        
        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${signoutId}`);
            if (response.ok) {
                const signout = await response.json();
                this.updateSignInDetails(signout);
            } else {
                this.updateSignInDetailsBasic(soldierNames, 'Unknown Location');
            }
        } catch (error) {
            console.error('Error fetching sign-out details for modal:', error);
            this.updateSignInDetailsBasic(soldierNames, 'Unknown Location');
        }
        
        const pinInput = this.app.domManager.get('pinInput');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
        
        const pinError = this.app.domManager.get('pinError');
        if (pinError) {
            pinError.style.display = 'none';
        }
    }

    requestPinForSettings() {
        console.log('requestPinForSettings called');
        
        const pinModal = this.app.domManager.get('pinModal');
        if (!pinModal) {
            console.error('PIN modal element not found!');
            this.app.notificationManager.showNotification('Settings modal not available', 'error');
            return;
        }
        
        pinModal.style.display = 'flex';
        pinModal.style.visibility = 'visible';
        pinModal.style.opacity = '1';
        pinModal.style.zIndex = '1001';
        pinModal.classList.add('show');
        
        console.log('PIN modal display set to flex');
        
        const pinInput = this.app.domManager.get('pinInput');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
        
        const pinError = this.app.domManager.get('pinError');
        if (pinError) {
            pinError.style.display = 'none';
        }
        
        pinModal.dataset.purpose = 'settings';
        console.log('PIN modal purpose set to settings');
        
        const modalTitle = pinModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Enter PIN for Settings Access';
            console.log('Modal title updated');
        } else {
            console.error('Modal title element not found!');
        }
        
        const modalSubmitButton = pinModal.querySelector('pinSubmitText');
        if (modalSubmitButton) {
            modalSubmitButton.textContent = 'View Settings';
            console.log('Modal button updated');
        } else {
            console.error('Modal button element not found!');
        }

        const signInDetails = this.app.domManager.get('signInDetails');
        if (signInDetails) {
            signInDetails.style.display = 'none';
            console.log('Sign-in details hidden for settings access');
        }
        
        pinModal.offsetHeight;
        
        console.log('PIN modal should now be visible');
    }

    closePinModal() {
        const pinModal = this.app.domManager.get('pinModal');
        if (pinModal) {
            pinModal.style.display = 'none';
            pinModal.style.visibility = 'hidden';
            pinModal.style.opacity = '0';
            pinModal.classList.remove('show');
        }
        
        const pinInput = this.app.domManager.get('pinInput');
        if (pinInput) {
            pinInput.value = '';
        }
        
        const pinError = this.app.domManager.get('pinError');
        if (pinError) {
            pinError.style.display = 'none';
        }
        
        this.resetPinModalState();
        
        if (pinModal) {
            delete pinModal.dataset.purpose;
        }
        
        this.app.currentSignOutId = null;
    }

    resetPinModalState() {
        const pinModal = this.app.domManager.get('pinModal');
        const modalTitle = pinModal?.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Enter PIN to Sign In';
        }
        
        const signInDetails = this.app.domManager.get('signInDetails');
        if (signInDetails) {
            signInDetails.style.display = 'block';
        }
        
        this.app.authManager.targetUser = null;
    }

    showPinError(message) {
        const pinError = this.app.domManager.get('pinError');
        if (pinError) {
            pinError.textContent = message;
            pinError.style.display = 'block';
        }
    }

    updateSignInDetails(signout) {
        const signInDetails = this.app.domManager.get('signInDetails');
        if (!signInDetails) return;
        
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
        
        signInDetails.innerHTML = `
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
        const signInDetails = this.app.domManager.get('signInDetails');
        if (!signInDetails) return;
        
        signInDetails.innerHTML = `
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

    // Sign-out Modal Management
    openNewSignOutModal() {
        const signOutModal = this.app.domManager.get('signOutModal');
        if (signOutModal) {
            signOutModal.style.display = 'flex';
            
            const signOutForm = this.app.domManager.get('signOutForm');
            if (signOutForm) {
                signOutForm.reset();
            }
            
            this.app.barcodeManager.clearSoldiers();
            
            const firstInput = signOutForm?.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    closeNewSignOutModal() {
        const signOutModal = this.app.domManager.get('signOutModal');
        if (signOutModal) {
            signOutModal.style.display = 'none';
        }
        
        const signOutForm = this.app.domManager.get('signOutForm');
        if (signOutForm) {
            signOutForm.reset();
        }
        
        this.app.barcodeManager.clearSoldiers();
    }

    // Info Modal Management
    async showSignOutInfo(signoutId) {
        try {
            const response = await Utils.fetchWithAuth(`/api/signouts/${signoutId}`);
            if (!response.ok) throw new Error('Failed to fetch sign-out details');
            
            const signout = await response.json();
            
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
            
            const infoModalContent = this.app.domManager.get('infoModalContent');
            const infoModal = this.app.domManager.get('infoModal');
            
            if (infoModalContent) {
                infoModalContent.innerHTML = content;
            }
            if (infoModal) {
                infoModal.style.display = 'flex';
            }
            
        } catch (error) {
            console.error('Error loading sign-out info:', error);
            this.app.notificationManager.showNotification('Failed to load sign-out details', 'error');
        }
    }

    closeInfoModal() {
        const infoModal = this.app.domManager.get('infoModal');
        if (infoModal) {
            infoModal.style.display = 'none';
        }
    }

    // User Management Modals
    openAddUserModal() {
        const addUserModal = this.app.domManager.get('addUserModal');
        if (addUserModal) {
            addUserModal.style.display = 'flex';
            addUserModal.style.visibility = 'visible';
            addUserModal.style.opacity = '1';
            addUserModal.classList.add('show');
            
            const addUserForm = this.app.domManager.get('addUserForm');
            if (addUserForm) {
                addUserForm.reset();
            }
            
            const addUserError = this.app.domManager.get('addUserError');
            if (addUserError) {
                addUserError.style.display = 'none';
            }
            
            const firstInput = addUserForm?.querySelector('input, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeAddUserModal() {
        const addUserModal = this.app.domManager.get('addUserModal');
        if (addUserModal) {
            addUserModal.style.display = 'none';
            addUserModal.style.visibility = 'hidden';
            addUserModal.style.opacity = '0';
            addUserModal.classList.remove('show');
        }
        
        const addUserForm = this.app.domManager.get('addUserForm');
        if (addUserForm) {
            addUserForm.reset();
        }
        
        const addUserError = this.app.domManager.get('addUserError');
        if (addUserError) {
            addUserError.style.display = 'none';
        }
    }

    openChangePinModal(userId, userName) {
        const changePinModal = this.app.domManager.get('changePinModal');
        const changePinUserId = this.app.domManager.get('changePinUserId');
        const changePinUserInfo = this.app.domManager.get('changePinUserInfo');
        
        if (changePinModal) {
            changePinModal.style.display = 'flex';
            changePinModal.style.visibility = 'visible';
            changePinModal.style.opacity = '1';
            changePinModal.classList.add('show');
        }
        
        if (changePinUserId) {
            changePinUserId.value = userId;
        }
        
        if (changePinUserInfo) {
            changePinUserInfo.textContent = userName;
        }
        
        const changePinForm = this.app.domManager.get('changePinForm');
        if (changePinForm) {
            changePinForm.reset();
            changePinUserId.value = userId;
        }
        
        const changePinError = this.app.domManager.get('changePinError');
        if (changePinError) {
            changePinError.style.display = 'none';
        }
    }

    closeChangePinModal() {
        const changePinModal = this.app.domManager.get('changePinModal');
        if (changePinModal) {
            changePinModal.style.display = 'none';
            changePinModal.style.visibility = 'hidden';
            changePinModal.style.opacity = '0';
            changePinModal.classList.remove('show');
        }
        
        const changePinForm = this.app.domManager.get('changePinForm');
        if (changePinForm) {
            changePinForm.reset();
        }
        
        const changePinError = this.app.domManager.get('changePinError');
        if (changePinError) {
            changePinError.style.display = 'none';
        }
    }

    openDeleteUserModal(userId, userName) {
        const deleteUserModal = this.app.domManager.get('deleteUserModal');
        const deleteUserId = this.app.domManager.get('deleteUserId');
        const deleteUserInfo = this.app.domManager.get('deleteUserInfo');
        
        if (deleteUserModal) {
            deleteUserModal.style.display = 'flex';
            deleteUserModal.style.visibility = 'visible';
            deleteUserModal.style.opacity = '1';
            deleteUserModal.classList.add('show');
        }
        
        if (deleteUserId) {
            deleteUserId.value = userId;
        }
        
        if (deleteUserInfo) {
            deleteUserInfo.textContent = userName;
        }
        
        const deleteUserForm = this.app.domManager.get('deleteUserForm');
        if (deleteUserForm) {
            deleteUserForm.reset();
            deleteUserId.value = userId;
        }
        
        const deleteUserError = this.app.domManager.get('deleteUserError');
        if (deleteUserError) {
            deleteUserError.style.display = 'none';
        }
    }

    closeDeleteUserModal() {
        const deleteUserModal = this.app.domManager.get('deleteUserModal');
        if (deleteUserModal) {
            deleteUserModal.style.display = 'none';
            deleteUserModal.style.visibility = 'hidden';
            deleteUserModal.style.opacity = '0';
            deleteUserModal.classList.remove('show');
        }
        
        const deleteUserForm = this.app.domManager.get('deleteUserForm');
        if (deleteUserForm) {
            deleteUserForm.reset();
        }
        
        const deleteUserError = this.app.domManager.get('deleteUserError');
        if (deleteUserError) {
            deleteUserError.style.display = 'none';
        }
    }

    openChangeAdminCredentialsModal(userId) {
        const changeAdminCredentialsModal = this.app.domManager.get('changeAdminCredentialsModal');
        const adminCredentialsUserId = this.app.domManager.get('adminCredentialsUserId');
        
        if (changeAdminCredentialsModal) {
            changeAdminCredentialsModal.style.display = 'flex';
            changeAdminCredentialsModal.style.visibility = 'visible';
            changeAdminCredentialsModal.style.opacity = '1';
            changeAdminCredentialsModal.classList.add('show');
        }
        
        if (adminCredentialsUserId) {
            adminCredentialsUserId.value = userId;
        }
        
        const changeAdminCredentialsForm = this.app.domManager.get('changeAdminCredentialsForm');
        if (changeAdminCredentialsForm) {
            changeAdminCredentialsForm.reset();
            adminCredentialsUserId.value = userId;
        }
        
        const changeAdminCredentialsError = this.app.domManager.get('changeAdminCredentialsError');
        if (changeAdminCredentialsError) {
            changeAdminCredentialsError.style.display = 'none';
        }
    }

    closeChangeAdminCredentialsModal() {
        const changeAdminCredentialsModal = this.app.domManager.get('changeAdminCredentialsModal');
        if (changeAdminCredentialsModal) {
            changeAdminCredentialsModal.style.display = 'none';
            changeAdminCredentialsModal.style.visibility = 'hidden';
            changeAdminCredentialsModal.style.opacity = '0';
            changeAdminCredentialsModal.classList.remove('show');
        }
        
        const changeAdminCredentialsForm = this.app.domManager.get('changeAdminCredentialsForm');
        if (changeAdminCredentialsForm) {
            changeAdminCredentialsForm.reset();
        }
        
        const changeAdminCredentialsError = this.app.domManager.get('changeAdminCredentialsError');
        if (changeAdminCredentialsError) {
            changeAdminCredentialsError.style.display = 'none';
        }
    }

    // Manage Permissions Modal
    async openManagePermissionsModal(userId, userName) {
        if (!this.app.permissionsManager?.canManagePermissions()) {
            this.app.permissionsManager?.showPermissionDenied('manage user permissions');
            return;
        }

        // Check if trying to edit own permissions
        if (this.app.currentUser && this.app.currentUser.id == userId) {
            this.app.notificationManager.showNotification(
                'You cannot edit your own permissions', 
                'error'
            );
            return;
        }

        try {
            // Refresh DOM manager to ensure we have the latest elements
            this.app.domManager.refresh();
            
            const modal = this.app.domManager.get('managePermissionsModal');
            const userNameElement = this.app.domManager.get('permissionsUserName');
            const permissionsCheckboxes = this.app.domManager.get('permissionsCheckboxes');
            
            console.log('Modal element:', modal);
            console.log('UserName element:', userNameElement);
            console.log('Checkboxes element:', permissionsCheckboxes);
            
            if (!modal) {
                // Try direct DOM query as fallback
                const modalDirect = document.getElementById('managePermissionsModal');
                console.log('Direct modal query:', modalDirect);
                
                if (!modalDirect) {
                    throw new Error('Manage permissions modal not found in DOM - modal does not exist');
                } else {
                    // Use direct query result
                    throw new Error('Manage permissions modal found via direct query but not through DOM manager');
                }
            }
            
            if (userNameElement) {
                userNameElement.textContent = userName;
            }
            
            // Store user ID for later use
            modal.dataset.userId = userId;
            
            // Load all available permissions with dependencies
            const allPermissions = await this.app.permissionsManager.fetchAllPermissions();
            
            // Load user's current permissions
            const response = await Utils.fetchWithAuth(`/api/permissions/user/${userId}`);
            if (!response.ok) throw new Error('Failed to load user permissions');
            
            const result = await response.json();
            const userPermissions = result.success ? result.permissions : [];
            
            // Load current user's permissions to check what they can grant
            const currentUserPermissions = this.app.permissionsManager.userPermissions || [];
            
            // Populate permissions checkboxes with hierarchy
            this.populatePermissionsWithHierarchy(permissionsCheckboxes, allPermissions, userPermissions, currentUserPermissions);
            
            // Add event listeners for dependency checking
            this.setupPermissionDependencyListeners(permissionsCheckboxes, allPermissions, userPermissions, currentUserPermissions);
            
            this.clearManagePermissionsError();
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error opening manage permissions modal:', error);
            this.app.notificationManager.showNotification('Failed to load permissions data', 'error');
        }
    }

    populatePermissionsWithHierarchy(container, allPermissions, userPermissions, currentUserPermissions) {
        // Define permission categories for better organization
        const permissionCategories = {
            'Basic Dashboard Access': ['view_dashboard'],
            'Logging & Reports': ['view_logs'],
            'System Settings': ['view_settings'],
            'System Administration': ['system_admin']
        };
        
        // Create a map of permissions
        const permissionMap = new Map();
        const processedPermissions = new Set();
        
        // First pass: create permission objects
        allPermissions.forEach(permission => {
            permissionMap.set(permission.name, {
                ...permission,
                children: permission.children || [],
                parent: permission.parent || null
            });
        });
        
        // Third pass: build hierarchical HTML by categories
        const permissionHtml = [];
        
        // Process each category
        Object.entries(permissionCategories).forEach(([categoryName, rootPermissions]) => {
            const categoryPerms = rootPermissions.filter(permName => permissionMap.has(permName));
            if (categoryPerms.length === 0) return;
            
            // Add category header
            permissionHtml.push(`
                <div class="permission-group ${categoryName.includes('Administration') ? 'admin-group' : ''}">
                    <div class="permission-group-header">${categoryName}</div>
                    <div class="permission-group-content">
            `);
            
            // Process root permissions and their hierarchy
            categoryPerms.forEach(rootPermName => {
                if (processedPermissions.has(rootPermName)) return;
                
                this.addPermissionWithChildren(
                    permissionHtml, 
                    permissionMap, 
                    rootPermName, 
                    userPermissions, 
                    currentUserPermissions,
                    processedPermissions, 
                    0
                );
            });
            
            permissionHtml.push(`
                    </div>
                </div>
            `);
        });

        container.innerHTML = permissionHtml.join('');
    }

    addPermissionWithChildren(htmlArray, permissionMap, permissionName, userPermissions, currentUserPermissions, processedPermissions, depth) {
        if (processedPermissions.has(permissionName)) return;
        
        const permission = permissionMap.get(permissionName);
        if (!permission) return;
        
        processedPermissions.add(permissionName);
        
        const isChecked = userPermissions.includes(permissionName);
        const isSystemAdmin = permissionName === 'system_admin';
        const canGrant = currentUserPermissions.includes(permissionName) || currentUserPermissions.includes('system_admin');
        
        // Add the permission
        htmlArray.push(this.createPermissionHtml(permission, isChecked, depth, isSystemAdmin, canGrant));
        
        // Add children recursively
        if (permission.children && permission.children.length > 0) {
            permission.children.forEach(childName => {
                this.addPermissionWithChildren(
                    htmlArray, 
                    permissionMap, 
                    childName, 
                    userPermissions, 
                    currentUserPermissions,
                    processedPermissions, 
                    depth + 1
                );
            });
        }
    }

    createPermissionHtml(permission, isChecked, depth, isSystemAdmin = false, canGrant = true) {
        const indentClass = depth > 0 ? ` permission-child depth-${depth}` : '';
        const adminClass = isSystemAdmin ? ' system-admin-permission' : '';
        
        // Format permission name for display
        const displayName = permission.name.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        // Special styling for default permissions
        const isDefault = ['view_dashboard', 'create_signout', 'sign_in_soldiers'].includes(permission.name);
        const defaultNote = isDefault ? '<div class="permission-default-note">Default permission</div>' : '';
        
        // Disable checkbox if user can't grant this permission
        const disabled = !canGrant ? 'disabled' : '';
        const disabledNote = !canGrant ? '<div class="permission-disabled-note">You don\'t have permission to grant this</div>' : '';
        
        return `
            <div class="permission-item${indentClass}${adminClass}" data-permission="${permission.name}" data-depth="${depth}">
                <input type="checkbox" 
                       id="perm_${permission.id}" 
                       value="${permission.name}" 
                       ${isChecked ? 'checked' : ''}
                       ${disabled}
                       data-depth="${depth}"
                       data-is-system-admin="${isSystemAdmin}"
                       data-can-grant="${canGrant}">
                <div class="permission-info">
                    <div class="permission-name">${displayName}</div>
                    <div class="permission-description">${permission.description || 'No description available'}</div>
                    ${defaultNote}
                    ${disabledNote}
                </div>
            </div>
        `;
    }

    setupPermissionDependencyListeners(container, allPermissions, userPermissions, currentUserPermissions) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:not([disabled])');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const permissionName = e.target.value;
                const isChecked = e.target.checked;
                const isSystemAdmin = e.target.dataset.isSystemAdmin === 'true';
                const canGrant = e.target.dataset.canGrant === 'true';
                
                if (!canGrant) {
                    // Prevent changes if user doesn't have permission to grant this
                    e.target.checked = !isChecked;
                    this.app.notificationManager.showNotification(
                        `You don't have permission to modify ${permissionName.replace(/_/g, ' ')}`, 
                        'error'
                    );
                    return;
                }
                
                if (isSystemAdmin && isChecked) {
                    // System admin permission - check all other permissions
                    this.autoCheckAllPermissions(container);
                } else if (isChecked) {
                    // Auto-check parent permissions
                    this.autoCheckParentPermissions(permissionName, allPermissions, container);
                } else {
                    // Remove children automatically when parent is unchecked
                    this.autoRemoveChildren(permissionName, allPermissions, container);
                }
            });
        });
    }

    autoCheckAllPermissions(container) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:not([disabled])');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
            }
        });
        this.app.notificationManager.showNotification(
            'System Admin: All permissions automatically enabled', 
            'info'
        );
    }

    autoCheckParentPermissions(permissionName, allPermissions, container) {
        const permission = allPermissions.find(p => p.name === permissionName);
        const parent = permission?.parent;
        
        if (parent) {
            const parentCheckbox = container.querySelector(`input[value="${parent}"]`);
            if (parentCheckbox && !parentCheckbox.checked) {
                parentCheckbox.checked = true;
                this.app.notificationManager.showNotification(
                    `Auto-enabled parent permission: ${parent.replace(/_/g, ' ')}`, 
                    'info'
                );
                
                // Recursively check parent's parent
                this.autoCheckParentPermissions(parent, allPermissions, container);
            }
        }
    }

    autoRemoveChildren(permissionName, allPermissions, container) {
        // Find and uncheck all children of this permission
        const children = this.getPermissionChildren(permissionName, allPermissions);
        
        children.forEach(childName => {
            const childCheckbox = container.querySelector(`input[value="${childName}"]`);
            if (childCheckbox && childCheckbox.checked) {
                childCheckbox.checked = false;
                this.app.notificationManager.showNotification(
                    `Auto-removed child permission: ${childName.replace(/_/g, ' ')}`, 
                    'info'
                );
                
                // Recursively remove grandchildren
                this.autoRemoveChildren(childName, allPermissions, container);
            }
        });
    }

    handlePermissionRemoval(permissionName, allPermissions, container) {
        // This method is no longer needed since we auto-remove children
        // But keeping it for compatibility
        this.autoRemoveChildren(permissionName, allPermissions, container);
    }

    getPermissionChildren(permissionName, allPermissions) {
        const permission = allPermissions.find(p => p.name === permissionName);
        return permission?.children || [];
    }

    closeManagePermissionsModal() {
        const modal = this.app.domManager.get('managePermissionsModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.clearManagePermissionsError();
    }

    clearManagePermissionsError() {
        const errorElement = this.app.domManager.get('managePermissionsError');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    showManagePermissionsError(message) {
        const errorElement = this.app.domManager.get('managePermissionsError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
}

export default ModalManager;
