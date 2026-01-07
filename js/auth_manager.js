/**
 * ============================================================================
 *  MODULE: Auth Manager
 *  RESPONSIBILITY: Auth UI & Firebase Auth Delegation
 * ============================================================================
 */
class AuthManager {
    constructor(app) {
        this.app = app;
        this.dom = {
            authModal: document.getElementById('auth-modal'),
            loginBtn: document.getElementById('login-btn'),
            closeAuthBtn: document.getElementById('close-auth-modal-btn'),
            googleLoginBtn: document.getElementById('google-login-btn'),
            emailLoginBtn: document.getElementById('email-login-btn'),
            emailRegisterBtn: document.getElementById('email-register-btn'),
            authEmail: document.getElementById('auth-email'),
            authPassword: document.getElementById('auth-password')
        };
        this.bindEvents();
    }

    bindEvents() {
        if (this.dom.loginBtn) {
            this.dom.loginBtn.addEventListener('click', () => {
                console.log('Login button clicked');
                this.showAuthModal();
            });
        }

        if (this.dom.closeAuthBtn) {
            this.dom.closeAuthBtn.addEventListener('click', () => this.hideAuthModal());
        }

        if (this.dom.googleLoginBtn) {
            this.dom.googleLoginBtn.addEventListener('click', () => {
                console.log('Google login clicked');
                this.handleGoogleLogin();
            });
        }

        if (this.dom.emailLoginBtn) {
            this.dom.emailLoginBtn.addEventListener('click', () => this.handleEmailLogin());
        }

        if (this.dom.emailRegisterBtn) {
            this.dom.emailRegisterBtn.addEventListener('click', () => this.handleEmailRegister());
        }
    }

    showAuthModal() {
        this.dom.authModal.classList.remove('hidden');
        this.dom.authModal.classList.add('visible');
    }

    hideAuthModal() {
        if (!this.dom.authModal) return;
        this.dom.authModal.classList.remove('visible');
        setTimeout(() => this.dom.authModal.classList.add('hidden'), 200);
    }

    async handleGoogleLogin() {
        try {
            console.log('Attempting Google Login...');
            if (!window.FirebaseService.auth) {
                console.log('Initializing Firebase Auth...');
                window.FirebaseService.init();
            }
            if (!window.FirebaseService.auth) {
                throw new Error('Firebase 初始化失敗，請重新整理頁面');
            }
            await window.FirebaseService.loginWithGoogle();
            this.hideAuthModal();
        } catch (e) {
            alert("Google Login Error: " + e.message);
            console.error("Login Exception:", e);
        }
    }

    async handleEmailLogin() {
        const email = this.dom.authEmail.value;
        const password = this.dom.authPassword.value;
        if (!email || !password) return alert('請輸入 Email 和密碼');

        try {
            await window.FirebaseService.signInWithEmail(email, password);
            this.hideAuthModal();
        } catch (e) {
            alert('登入失敗: ' + e.message);
        }
    }

    async handleEmailRegister() {
        const email = this.dom.authEmail.value;
        const password = this.dom.authPassword.value;
        if (!email || !password) return alert('請輸入 Email 和密碼');

        try {
            await window.FirebaseService.registerWithEmail(email, password);
            this.hideAuthModal();
        } catch (e) {
            alert('註冊失敗: ' + e.message);
        }
    }
}
