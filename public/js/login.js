class LoginApp {
    constructor() {
        this.currentStep = 'system'; 
        this.users = [];
        this.authCheckInProgress = false;
        this.initializeElements();
        this.attachEventListeners();
        this.checkExistingSession();
    }

    initializeElements() {
        
        this.loginContainer = document.getElementById('loginContainer');
        this.animatedBg = document.getElementById('animatedBg');
        
        
        this.systemPasswordForm = document.getElementById('systemPasswordForm');
        this.userSelectionForm = document.getElementById('userSelectionForm');
        
        
        this.systemPassword = document.getElementById('systemPassword');
        this.systemLoginBtn = document.getElementById('systemLoginBtn');
        this.systemErrorMessage = document.getElementById('systemErrorMessage');
        
        
        this.userSelect = document.getElementById('userSelect');
        this.userPin = document.getElementById('userPin');
        this.userLoginBtn = document.getElementById('userLoginBtn');
        this.userErrorMessage = document.getElementById('userErrorMessage');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        
        this.loginSubtitle = document.getElementById('loginSubtitle');
    }

    attachEventListeners() {
        
        this.systemLoginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSystemLogin();
        });

        this.systemPassword?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSystemLogin();
            }
        });

        
        this.userLoginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleUserLogin();
        });

        this.userPin?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleUserLogin();
            }
        });

        
        this.logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        
        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility(button);
            });
        });
    }

    async checkExistingSession() {
        try {
            
            if (this.authCheckInProgress) {
                return;
            }
            this.authCheckInProgress = true;
            
            const response = await fetch('/api/signouts/auth/check', {
                credentials: 'same-origin'
            });
            const result = await response.json();
            
            if (result.authenticated) {
                
                console.log('User authenticated, but checking if redirect is safe');
                
                
                const referrer = document.referrer;
                const currentPath = window.location.pathname;
                
                if (currentPath === '/login' && (!referrer || !referrer.includes('/login'))) {
                    console.log('Safe to redirect to dashboard');
                    window.location.href = '/';
                } else {
                    console.log('Redirect loop detected, staying on login page');
                    
                    this.showMessage('You are already logged in. Click here to go to dashboard.');
                }
            } else if (result.systemAuthenticated) {
                
                await this.loadUsers();
                this.showUserStep();
            } else {
                
                this.showSystemStep();
            }
        } catch (error) {
            console.error('Session check error:', error);
            this.showSystemStep();
        } finally {
            this.authCheckInProgress = false;
        }
    }

    async handleSystemLogin() {
        const password = this.systemPassword.value.trim();
        
        if (!password) {
            this.showSystemError('Please enter the system password.');
            return;
        }

        this.setSystemLoading(true);
        this.hideSystemError();

        try {
            const response = await fetch('/api/signouts/auth/system', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                await this.loadUsers();
                this.showUserStep();
            } else {
                this.showSystemError(result.error || 'Invalid system password');
            }
        } catch (error) {
            console.error('System login error:', error);
            this.showSystemError('Connection failed. Please try again.');
        } finally {
            this.setSystemLoading(false);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/signouts/auth/users', {
                credentials: 'same-origin'
            });

            if (response.ok) {
                this.users = await response.json();
                this.populateUserSelect();
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showSystemError('Failed to load user list. Please try again.');
        }
    }

    populateUserSelect() {
        this.userSelect.innerHTML = '<option value="">Choose an NCO...</option>';
        
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.rank} ${user.full_name}`;
            this.userSelect.appendChild(option);
        });
    }

    async handleUserLogin() {
        const userId = this.userSelect.value;
        const pin = this.userPin.value.trim();
        
        if (!userId) {
            this.showUserError('Please select an NCO.');
            return;
        }
        
        if (!pin) {
            this.showUserError('Please enter your PIN.');
            return;
        }

        this.setUserLoading(true);
        this.hideUserError();

        try {
            const response = await fetch('/api/signouts/auth/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ userId: parseInt(userId), pin })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                
                window.location.href = '/';
            } else {
                this.showUserError(result.error || 'Invalid PIN');
            }
        } catch (error) {
            console.error('User login error:', error);
            this.showUserError('Connection failed. Please try again.');
        } finally {
            this.setUserLoading(false);
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/signouts/auth/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
            
            this.systemPassword.value = '';
            this.userPin.value = '';
            this.showSystemStep();
        } catch (error) {
            console.error('Logout error:', error);
            
            this.showSystemStep();
        }
    }

    showSystemStep() {
        this.currentStep = 'system';
        
        
        this.loginContainer.classList.remove('user-step');
        this.animatedBg.classList.remove('user-step');
        
        
        this.userSelectionForm.style.display = 'none';
        this.systemPasswordForm.style.display = 'block';
        
        this.loginSubtitle.textContent = 'NCO Access Required';
        this.systemPassword.value = '';
        this.hideSystemError();
        
        
        this.systemPassword.focus();
    }

    showUserStep() {
        this.currentStep = 'user';
        
        
        this.animatedBg.classList.add('user-step');
        this.loginContainer.classList.add('user-step');
        
        
        this.systemPasswordForm.style.display = 'none';
        this.userSelectionForm.style.display = 'block';
        
        this.loginSubtitle.textContent = 'Select NCO and Enter PIN';
        this.userPin.value = '';
        this.hideUserError();
        
        
        setTimeout(() => {
            this.userSelect.focus();
        }, 200);
    }

    setSystemLoading(loading) {
        this.systemLoginBtn.disabled = loading;
        const btnText = this.systemLoginBtn.querySelector('.btn-text');
        const btnLoader = this.systemLoginBtn.querySelector('.btn-loader');
        btnText.style.display = loading ? 'none' : 'inline';
        btnLoader.style.display = loading ? 'inline-block' : 'none';
    }

    setUserLoading(loading) {
        this.userLoginBtn.disabled = loading;
        const btnText = this.userLoginBtn.querySelector('.btn-text');
        const btnLoader = this.userLoginBtn.querySelector('.btn-loader');
        btnText.style.display = loading ? 'none' : 'inline';
        btnLoader.style.display = loading ? 'inline-block' : 'none';
    }

    showSystemError(message) {
        this.systemErrorMessage.textContent = message;
        this.systemErrorMessage.style.display = 'block';
    }

    hideSystemError() {
        this.systemErrorMessage.style.display = 'none';
    }

    showUserError(message) {
        this.userErrorMessage.textContent = message;
        this.userErrorMessage.style.display = 'block';
    }

    hideUserError() {
        this.userErrorMessage.style.display = 'none';
    }

    showMessage(message) {
        
        let messageDiv = document.getElementById('loginMessage');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'loginMessage';
            messageDiv.style.cssText = `
                background: #4CAF50;
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
                cursor: pointer;
                font-weight: 500;
            `;
            
            
            const loginHeader = document.querySelector('.login-header');
            if (loginHeader) {
                loginHeader.parentNode.insertBefore(messageDiv, loginHeader.nextSibling);
            }
        }
        
        messageDiv.textContent = message;
        messageDiv.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    try {
        new LoginApp();
    } catch (error) {
        console.error('Error initializing LoginApp:', error);
    }
});
