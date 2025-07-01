class KeyboardManager {
    constructor(app) {
        this.app = app;
        this.initialize();
    }

    initialize() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
    }

    handleKeyDown(event) {
        if (this.isReloadKey(event)) {
            event.preventDefault();
            this.handleReloadKey();
        }
    }

    isReloadKey(event) {
        return (
            event.key === 'F5' ||
            (event.ctrlKey && event.key === 'r') ||
            (event.metaKey && event.key === 'r')
        );
    }

    handleReloadKey() {
        this.refreshCurrentView();
        this.app.notificationManager.showNotification('View refreshed', 'success');
    }

    refreshCurrentView() {
        const dashboardView = this.app.domManager.get('dashboardView');
        const logsView = this.app.domManager.get('logsView');
        const settingsView = this.app.domManager.get('settingsView');

        if (dashboardView && window.getComputedStyle(dashboardView).display !== 'none') {
            this.app.signOutManager.loadCurrentSignOuts();
        } else if (logsView && window.getComputedStyle(logsView).display !== 'none') {
            this.app.logsManager.loadFilteredLogs();
        } else if (settingsView && window.getComputedStyle(settingsView).display !== 'none') {
            this.app.settingsManager.loadSettingsData();
        } else {
            this.app.signOutManager.loadCurrentSignOuts();
        }
    }
}

export default KeyboardManager;
