/**
 * Notification System Module
 * Handles display and management of notification chips
 */
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationChips');
        this.backgroundObserver = null;
        this.initializeBackgroundDetection();
    }

    showNotification(message, type = 'info') {
        const notificationChip = document.createElement('div');
        notificationChip.className = `notification-chip ${type}`;
        
        // Icon based on type
        const iconMap = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        notificationChip.innerHTML = `
            <div class="notification-chip-icon">${iconMap[type] || iconMap.info}</div>
            <div class="notification-chip-content">${message}</div>
            <button class="notification-chip-close" title="Close">&times;</button>
        `;
        
        // Apply adaptive text color based on current background
        const backgroundColor = this.detectBackgroundColor();
        notificationChip.classList.add(backgroundColor);
        
        this.container.appendChild(notificationChip);
        
        // Auto hide after 5 seconds
        const autoHideTimer = setTimeout(() => {
            this.hideNotificationChip(notificationChip);
        }, 5000);
        
        // Close button event
        notificationChip.querySelector('.notification-chip-close').addEventListener('click', () => {
            clearTimeout(autoHideTimer);
            this.hideNotificationChip(notificationChip);
        });
        
        // Remove old notifications if too many
        const chips = this.container.querySelectorAll('.notification-chip');
        if (chips.length > 5) {
            this.hideNotificationChip(chips[0]);
        }
    }

    hideNotificationChip(chip) {
        chip.style.animation = 'slideOutToTop 0.3s ease-in';
        setTimeout(() => {
            if (chip.parentNode) {
                chip.parentNode.removeChild(chip);
            }
        }, 300);
    }

    initializeBackgroundDetection() {
        // Initialize mutation observer to detect when modals open/close
        this.backgroundObserver = new MutationObserver(() => {
            this.updateNotificationTextColor();
        });
        
        // Observe changes to modal visibility
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.backgroundObserver.observe(modal, {
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        });
        
        // Also observe body class changes
        this.backgroundObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Initial color update
        this.updateNotificationTextColor();
    }

    updateNotificationTextColor() {
        const notifications = this.container.querySelectorAll('.notification-chip');
        const backgroundColor = this.detectBackgroundColor();
        
        notifications.forEach(notification => {
            // Remove existing background classes
            notification.classList.remove('light-background', 'dark-background');
            
            // Add appropriate class based on detected background
            notification.classList.add(backgroundColor);
        });
    }

    detectBackgroundColor() {
        // Check if any modal is currently visible
        const signOutModalVisible = document.getElementById('signOutModal') && 
            (document.getElementById('signOutModal').style.display === 'flex' || 
             window.getComputedStyle(document.getElementById('signOutModal')).display === 'flex');
        
        const pinModalVisible = document.getElementById('pinModal') && 
            (document.getElementById('pinModal').style.display === 'flex' || 
             window.getComputedStyle(document.getElementById('pinModal')).display === 'flex');
        
        if (signOutModalVisible || pinModalVisible) {
            // Modal overlay creates a dark backdrop
            return 'dark-background';
        } else {
            // Main background is the gradient
            return 'light-background';
        }
    }
}
