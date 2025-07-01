class ThemeManager {
    constructor(app) {
        this.app = app;
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        this.loadThemeFromCookie();
        this.updateThemeIcon();
    }

    loadThemeFromCookie() {
        const savedTheme = this.getCookie('theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            this.currentTheme = savedTheme;
            this.applyTheme(this.currentTheme);
        }
    }

    async loadThemePreference() {
        if (!this.app.currentUser) return;

        try {
            const response = await Utils.fetchWithAuth(`/api/preferences/${this.app.currentUser.id}/theme`);
            if (response.ok) {
                const data = await response.json();
                if (data.theme) {
                    this.currentTheme = data.theme;
                    this.applyTheme(this.currentTheme);
                    this.setCookie('theme', this.currentTheme);
                    this.updateThemeIcon();
                }
            } else if (response.status === 404) {
                // No theme preference found, sync cookie with database
                await this.saveThemePreference(this.currentTheme);
                this.updateThemeIcon();
            }
        } catch (error) {
            console.log('No theme preference found, using cookie or default');
            this.updateThemeIcon();
        }
    }

    async toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.currentTheme = newTheme;
        
        this.applyTheme(newTheme);
        this.updateThemeIcon();
        this.setCookie('theme', newTheme);
        
        await this.saveThemePreference(newTheme);
        
        this.app.notificationManager.showNotification(
            `Switched to ${newTheme} mode`, 
            'success'
        );
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
    }

    updateThemeIcon() {
        const darkModeText = this.app.domManager.get('darkModeText');
        const darkModeIcon = document.querySelector('#darkModeToggle .icon');
        
        if (this.currentTheme === 'dark') {
            if (darkModeText) darkModeText.textContent = 'Light Mode';
            if (darkModeIcon) darkModeIcon.textContent = '☀️';
        } else {
            if (darkModeText) darkModeText.textContent = 'Dark Mode';
            if (darkModeIcon) darkModeIcon.textContent = '🌙';
        }
    }

    async saveThemePreference(theme) {
        if (!this.app.currentUser) return;

        try {
            const response = await Utils.fetchWithAuth(`/api/preferences/${this.app.currentUser.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    setting_key: 'theme',
                    setting_value: theme
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save theme preference');
            }
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    }

    setCookie(name, value, days = 365) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    getUserTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === 'dark';
    }
}

export default ThemeManager;
