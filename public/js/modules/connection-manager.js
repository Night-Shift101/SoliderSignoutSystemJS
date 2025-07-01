class ConnectionManager {
    constructor(app) {
        this.app = app;
        this.isOnline = true;
        this.checkInterval = null;
        this.overlay = null;
        this.checkIntervalMs = 2000; // Check every 5 seconds
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.initialize();
    }

    initialize() {
        this.createOverlay();
        this.startConnectionMonitoring();
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Intercept fetch requests to detect server connectivity
        this.interceptFetch();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'connectionOverlay';
        this.overlay.className = 'connection-overlay hidden';
        
        this.overlay.innerHTML = `
            <div class="connection-overlay-content">
                <div class="connection-icon">🔌</div>
                <h2>Lost Connection to Server</h2>
                <p>Unable to communicate with the server. Please check your internet connection.</p>
                <div class="connection-status">
                    <span class="retry-count">Retry attempt: <span id="retryCount">0</span> / ${this.maxRetryAttempts}</span>
                </div>
                <button id="refreshPageBtn" class="refresh-page-btn">Refresh Page</button>
                <button id="retryConnectionBtn" class="retry-connection-btn">Try Again</button>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        
        // Attach event listeners
        document.getElementById('refreshPageBtn').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('retryConnectionBtn').addEventListener('click', () => {
            this.retryConnection();
        });
    }

    showOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            document.body.style.overflow = '';
            this.retryAttempts = 0;
            this.updateRetryCount();
        }
    }

    updateRetryCount() {
        const retryCountElement = document.getElementById('retryCount');
        if (retryCountElement) {
            retryCountElement.textContent = this.retryAttempts;
        }
    }

    async checkServerConnection() {
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                cache: 'no-cache',
                timeout: 2000
            });
            
            if (response.ok) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async retryConnection() {
        this.retryAttempts++;
        this.updateRetryCount();
        
        const isConnected = await this.checkServerConnection();
        
        if (isConnected) {
            this.handleOnline();
            if (this.app && this.app.notificationManager) {
                this.app.notificationManager.showNotification('Connection restored successfully', 'success');
            }
        } else if (this.retryAttempts >= this.maxRetryAttempts) {
            // Show message about max attempts reached
            const statusElement = this.overlay.querySelector('.connection-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <span class="max-attempts-reached">Maximum retry attempts reached. Please refresh the page or check your connection.</span>
                `;
            }
        }
    }

    startConnectionMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(async () => {
            if (!this.isOnline) {
                const isConnected = await this.checkServerConnection();
                if (isConnected) {
                    this.handleOnline();
                }
            }
        }, this.checkIntervalMs);
    }

    stopConnectionMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    handleOnline() {
        if (!this.isOnline) {
            this.isOnline = true;
            this.hideOverlay();
            console.log('Connection restored');
        }
    }

    handleOffline() {
        if (this.isOnline) {
            this.isOnline = false;
            this.showOverlay();
            console.log('Connection lost');
        }
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // If we get a response, consider connection restored
                if (response.ok && !this.isOnline) {
                    this.handleOnline();
                }
                
                return response;
            } catch (error) {
                // Check if it's a network error
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    this.handleOffline();
                }
                throw error;
            }
        };
    }

    destroy() {
        this.stopConnectionMonitoring();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
    }
}

export default ConnectionManager;
