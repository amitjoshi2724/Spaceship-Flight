/**
 * Asteroidle - Firebase Authentication Module
 * Handles Google Sign-In, Sign-Out, and Auth State subscriptions.
 */
import { auth, googleProvider } from './firebase-config.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const authListeners = new Set();
let currentAuthUser = null;
let isInitialized = false;

// Track Auth State changes
onAuthStateChanged(auth, (user) => {
    currentAuthUser = user;
    isInitialized = true;
    renderAuthUI(user);
    authListeners.forEach(cb => {
        try {
            cb(user);
        } catch (e) {
            console.error("Error in auth listener:", e);
        }
    });
});

/**
 * Sign in using Google Popup
 */
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.log('User closed Google Sign-In popup.');
            return null;
        }
        if (error.code === 'auth/unauthorized-domain') {
            alert('Domain unauthorized. Please ensure this domain is added to Authorized Domains in the Firebase Console.');
            return null;
        }
        console.error('Google Sign-In Error:', error);
        alert(`Sign in failed: ${error.message}`);
        return null;
    }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Sign Out Error:', error);
    }
}

/**
 * Subscribe to auth state updates
 */
export function onAuthChange(callback) {
    authListeners.add(callback);
    if (isInitialized) {
        callback(currentAuthUser);
    }
    return () => authListeners.delete(callback);
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
    return currentAuthUser;
}

/**
 * Render the Auth UI in the header
 */
export function renderAuthUI(user) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (!user) {
        authContainer.innerHTML = `
            <button id="google-login-btn" class="auth-btn google-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 6px; flex-shrink: 0;">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with Google
            </button>
        `;
        const loginBtn = document.getElementById('google-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', signInWithGoogle);
        }
    } else {
        const photoUrl = user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
        const displayName = user.displayName || user.email || 'Cadet';

        authContainer.innerHTML = `
            <div class="user-auth-widget">
                <div id="user-info-btn" class="user-profile-badge" tabindex="0" aria-haspopup="true" aria-expanded="false">
                    <img id="user-avatar" src="${photoUrl}" alt="${displayName}" class="user-avatar-img">
                    <span id="user-display-name" class="user-display-name">${displayName}</span>
                    <span class="dropdown-caret">▼</span>
                </div>
                <div id="identity-dropdown" class="user-dropdown-menu">
                    <div class="dropdown-header">
                        <span class="account-title">PILOT PROFILE</span>
                        <span class="user-email-subtitle">${user.email || ''}</span>
                    </div>
                    <button id="signout-btn" class="dropdown-item signout-btn">Sign Out</button>
                </div>
            </div>
        `;

        const userInfoBtn = document.getElementById('user-info-btn');
        const dropdown = document.getElementById('identity-dropdown');
        const signoutBtn = document.getElementById('signout-btn');

        if (userInfoBtn && dropdown) {
            userInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('active');
                dropdown.classList.toggle('active', !isOpen);
                userInfoBtn.setAttribute('aria-expanded', String(!isOpen));
            });

            document.addEventListener('click', (e) => {
                if (!authContainer.contains(e.target)) {
                    dropdown.classList.remove('active');
                    userInfoBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (signoutBtn) {
            signoutBtn.addEventListener('click', signOutUser);
        }
    }
}
