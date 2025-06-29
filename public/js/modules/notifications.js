class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationChips');
        this.backgroundObserver = null;
        this.initializeBackgroundDetection();
    }

    showNotification(message, type = 'info') {
        const notificationChip = document.createElement('div');
        notificationChip.className = `notification-chip ${type}`;
        
        
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
        
        
        const backgroundColor = this.detectBackgroundColor();
        notificationChip.classList.add(backgroundColor);
        
        this.container.appendChild(notificationChip);
        
        
        const autoHideTimer = setTimeout(() => {
            this.hideNotificationChip(notificationChip);
        }, 5000);
        
        
        notificationChip.querySelector('.notification-chip-close').addEventListener('click', () => {
            clearTimeout(autoHideTimer);
            this.hideNotificationChip(notificationChip);
        });
        
        
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
        
        this.backgroundObserver = new MutationObserver(() => {
            this.updateNotificationTextColor();
        });
        
        
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.backgroundObserver.observe(modal, {
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        });
        
        
        this.backgroundObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        
        this.updateNotificationTextColor();
    }

    updateNotificationTextColor() {
        const notifications = this.container.querySelectorAll('.notification-chip');
        const backgroundColor = this.detectBackgroundColor();
        
        notifications.forEach(notification => {
            
            notification.classList.remove('light-background', 'dark-background');
            
            
            notification.classList.add(backgroundColor);
        });
    }

    detectBackgroundColor() {
        
        const signOutModalVisible = document.getElementById('signOutModal') && 
            (document.getElementById('signOutModal').style.display === 'flex' || 
             window.getComputedStyle(document.getElementById('signOutModal')).display === 'flex');
        
        const pinModalVisible = document.getElementById('pinModal') && 
            (document.getElementById('pinModal').style.display === 'flex' || 
             window.getComputedStyle(document.getElementById('pinModal')).display === 'flex');
        
        if (signOutModalVisible || pinModalVisible) {
            
            return 'dark-background';
        } else {
            
            return 'light-background';
        }
    }
}

export default NotificationManager;
