class ViewManager {
    constructor(app) {
        this.app = app;
    }

    showDashboardView() {
        const dashboardView = this.app.domManager.get('dashboardView');
        const logsView = this.app.domManager.get('logsView');
        const settingsView = this.app.domManager.get('settingsView');
        
        if (dashboardView) dashboardView.style.display = 'block';
        if (logsView) logsView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'none';
        
        this.app.signOutManager.loadCurrentSignOuts();
        this.app.signOutManager.startDurationUpdates();
    }

    showLogsView() {
        const dashboardView = this.app.domManager.get('dashboardView');
        const logsView = this.app.domManager.get('logsView');
        const settingsView = this.app.domManager.get('settingsView');
        
        if (dashboardView) dashboardView.style.display = 'none';
        if (logsView) logsView.style.display = 'block';
        if (settingsView) settingsView.style.display = 'none';
        
        this.app.signOutManager.stopDurationUpdates();
        this.app.logsManager.loadFilteredLogs();
    }

    showSettingsWithAuth() {
        console.log('showSettingsWithAuth called');
        this.app.modalManager.requestPinForSettings();
    }

    showSettingsView() {
        console.log('showSettingsView called');
        
        const dashboardView = this.app.domManager.get('dashboardView');
        const logsView = this.app.domManager.get('logsView');
        const settingsView = this.app.domManager.get('settingsView');
        
        if (dashboardView) dashboardView.style.display = 'none';
        if (logsView) logsView.style.display = 'none';
        if (settingsView) {
            settingsView.style.display = 'block';
            console.log('Settings view should now be visible');
        } else {
            console.error('Settings view element not found!');
        }
        
        this.app.signOutManager.stopDurationUpdates();
        this.app.settingsManager.loadSettingsData();
    }

    toggleUserSelector() {
        const userSelectorDropdown = this.app.domManager.get('userSelectorDropdown');
        
        if (!userSelectorDropdown) {
            console.error('User selector dropdown element not found!');
            return;
        }
        
        if (userSelectorDropdown.parentElement.classList.contains('active')) {
            this.closeUserSelector();
        } else {
            this.openUserSelector();
        }
    }
    
    async openUserSelector() {
        const userSelectorDropdown = this.app.domManager.get('userSelectorDropdown');
        const userSelectorBtn = this.app.domManager.get('userSelectorBtn');
        
        if (userSelectorDropdown) {
            userSelectorDropdown.parentElement.classList.add('active');
        }
        if (userSelectorBtn) {
            userSelectorBtn.classList.add('active');
        }
        
        await this.app.userManager.loadUsers();
    }
    
    closeUserSelector() {
        const userSelectorDropdown = this.app.domManager.get('userSelectorDropdown');
        const userSelectorBtn = this.app.domManager.get('userSelectorBtn');
        
        if (userSelectorDropdown) {
            userSelectorDropdown.parentElement.classList.remove('active');
        }
        if (userSelectorBtn) {
            userSelectorBtn.classList.remove('active');
        }
    }

    toggleHamburgerMenu() {
        const hamburgerMenu = this.app.domManager.get('hamburgerMenu');
        
        if (!hamburgerMenu) {
            console.error('Hamburger menu element not found!');
            return;
        }
        
        if (hamburgerMenu.classList.contains('active')) {
            this.closeHamburgerMenu();
        } else {
            this.openHamburgerMenu();
        }
    }
    
    openHamburgerMenu() {
        const hamburgerMenu = this.app.domManager.get('hamburgerMenu');
        const hamburgerDropdown = this.app.domManager.get('hamburgerDropdown');
        
        if (hamburgerMenu) {
            hamburgerMenu.classList.add('active');
        }
        
        setTimeout(() => {
            if (hamburgerDropdown) {
                hamburgerDropdown.style.pointerEvents = 'auto';
            }
        }, 100);
    }
    
    closeHamburgerMenu() {
        const hamburgerMenu = this.app.domManager.get('hamburgerMenu');
        const hamburgerDropdown = this.app.domManager.get('hamburgerDropdown');
        
        if (hamburgerMenu) {
            hamburgerMenu.classList.remove('active');
        }
        if (hamburgerDropdown) {
            hamburgerDropdown.style.pointerEvents = 'none';
        }
    }
}

export default ViewManager;
