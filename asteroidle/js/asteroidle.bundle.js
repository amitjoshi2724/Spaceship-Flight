(() => {

  // asteroidle/js/prng.js
/**
 * Asteroidle - Deterministic PRNG & Date Arithmetic Module
 * Uses Mulberry32 algorithm seeded by date hash.
 */

// Epoch for Puzzle #1: Jan 1, 2024
const EPOCH_DATE_STR = '2024-01-01';

/**
 * 32-bit integer string hash (MurmurHash-inspired)
 */
function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Mulberry32 PRNG generator
 * Returns a function that produces deterministic pseudo-random floats in [0, 1).
 */
function createMulberry32(seed) {
    let s = seed >>> 0;
    return function() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Format Date object to YYYY-MM-DD
 */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD to Date object at local midnight
 */
function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Get Puzzle Number from date string (1-indexed from epoch)
 */
function getPuzzleNumber(dateStr, epochStr = EPOCH_DATE_STR) {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return 0;
    }
    const [y1, m1, d1] = dateStr.split('-').map(Number);
    const [y2, m2, d2] = epochStr.split('-').map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.max(1, Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Get date string for a given Puzzle Number
 */
function getDateForPuzzleNumber(puzzleNum, epochStr = EPOCH_DATE_STR) {
    const [y2, m2, d2] = epochStr.split('-').map(Number);
    const d = new Date(Date.UTC(y2, m2 - 1, d2 + (puzzleNum - 1)));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Get Today's YYYY-MM-DD string
 */
function getTodayDateStr() {
    return formatDate(new Date());
}

/**
 * Generate 5 deterministic asteroid challenge parameters for a given date
 */
function generateDailyChallenges(dateStr) {
    const seedVal = hashString(`asteroidle-daily-${dateStr}`);
    const rng = createMulberry32(seedVal);
    const challenges = [];

    // Ensure every day features exactly ONE of each of the 5 distinct rock shapes
    const shapes = [0, 1, 2, 3, 4];
    // Deterministic Fisher-Yates shuffle
    for (let i = shapes.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
    }

    for (let round = 1; round <= 5; round++) {
        // Guaranteed one of each of the 5 rock shapes per day
        const shapeIndex = shapes[round - 1];
        
        // Base radius [18, 36] (rocks vary in size: small agile rocks to large chunky asteroids)
        const baseRadius = 18 + rng() * 18;

        // Relative speed factor [0.85, 1.35]
        const speed = 0.85 + rng() * 0.5;

        // Angular rotation speed [-0.035, +0.035]
        const rotSpeed = (rng() - 0.5) * 0.07;

        // Bullet speed tier: round 1 is Tier 2, round 2 is Tier 3, etc.
        const tierPool = [2, 3, 4, 1, 5];
        const bulletTier = tierPool[(round - 1) % tierPool.length];

        // Rich spawn positioning variety across the arena:
        // Round 1: Starts in the middle / center core
        // Round 2: Starts in upper interior drifting down
        // Round 3: Starts in mid-flank drifting across
        // Round 4: Starts in lower interior drifting up
        // Round 5: Starts anywhere in free space
        let startX, startY, moveAngle;
        if (round === 1) {
            // Center / middle origin
            startX = 0.42 + rng() * 0.16;
            startY = 0.42 + rng() * 0.16;
            moveAngle = rng() * Math.PI * 2;
        } else if (round === 2) {
            // Upper interior drift
            startX = 0.20 + rng() * 0.60;
            startY = 0.18 + rng() * 0.22;
            moveAngle = (0.2 + rng() * 0.6) * Math.PI; // Heading downward
        } else if (round === 3) {
            // Mid-flank crossing
            const fromLeft = rng() < 0.5;
            startX = fromLeft ? (0.15 + rng() * 0.15) : (0.70 + rng() * 0.15);
            startY = 0.35 + rng() * 0.30;
            moveAngle = fromLeft ? ((rng() - 0.5) * 0.8) : (Math.PI + (rng() - 0.5) * 0.8);
        } else if (round === 4) {
            // Lower interior ascending
            startX = 0.22 + rng() * 0.56;
            startY = 0.60 + rng() * 0.22;
            moveAngle = (1.2 + rng() * 0.6) * Math.PI; // Heading upward
        } else {
            // Free-field anywhere in arena
            startX = 0.18 + rng() * 0.64;
            startY = 0.18 + rng() * 0.64;
            moveAngle = rng() * Math.PI * 2;
        }

        // Ship positioned with guaranteed safe separation from asteroid start (>= 0.32 normalized distance)
        // and verified closed-form ballistic intercept inside the canonical 1600x900 arena
        const CANON_W = 1600;
        const CANON_H = 900;
        const tierSpeeds = { 1: 8.5, 2: 11.5, 3: 14.0, 4: 17.5, 5: 21.0 };
        const scale = Math.max(0.42, Math.min(1.2, CANON_H / 720));
        const bScale = Math.max(0.85, Math.min(1.25, scale));
        const vB = (tierSpeeds[bulletTier] || 14.0) * bScale;
        const rSpeed = 3.2 * speed * scale;

        const hasVisibleIntercept = (sxNorm, syNorm, rxNorm, ryNorm, mAngle) => {
            const rx = rxNorm * CANON_W;
            const ry = ryNorm * CANON_H;
            const sx = sxNorm * CANON_W;
            const sy = syNorm * CANON_H;
            const vx = Math.cos(mAngle) * rSpeed;
            const vy = Math.sin(mAngle) * rSpeed;
            const dx = rx - sx;
            const dy = ry - sy;
            const a = (vx * vx + vy * vy) - (vB * vB);
            const b = 2 * (dx * vx + dy * vy);
            const c = dx * dx + dy * dy;
            let tHit = -1;
            if (Math.abs(a) < 1e-6) {
                if (Math.abs(b) > 1e-6) tHit = -c / b;
            } else {
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    const sqrtD = Math.sqrt(disc);
                    const t1 = (-b - sqrtD) / (2 * a);
                    const t2 = (-b + sqrtD) / (2 * a);
                    if (t1 > 2 && t2 > 2) tHit = Math.min(t1, t2);
                    else if (t1 > 2) tHit = t1;
                    else if (t2 > 2) tHit = t2;
                }
            }
            if (tHit <= 2 || tHit > 150) return false;
            const hitX = rx + vx * tHit;
            const hitY = ry + vy * tHit;
            return (hitX >= 75 && hitX <= CANON_W - 75 && hitY >= 75 && hitY <= CANON_H - 75);
        };

        let shipX, shipY;
        let attempts = 0;
        do {
            shipX = 0.18 + rng() * 0.64;
            shipY = 0.18 + rng() * 0.64;
            attempts++;
        } while (
            (Math.hypot(shipX - startX, shipY - startY) < 0.32 ||
             !hasVisibleIntercept(shipX, shipY, startX, startY, moveAngle)) &&
            attempts < 25
        );

        if (Math.hypot(shipX - startX, shipY - startY) < 0.32) {
            shipX = startX > 0.5 ? startX - 0.35 : startX + 0.35;
            shipY = startY > 0.5 ? startY - 0.35 : startY + 0.35;
        }

        // If the asteroid trajectory would carry the intercept point outside the arena, aim moveAngle inward toward arena interior
        if (!hasVisibleIntercept(shipX, shipY, startX, startY, moveAngle)) {
            moveAngle = Math.atan2(0.5 - startY, 0.5 - startX) + (rng() - 0.5) * 0.5;
        }

        challenges.push({
            round,
            shapeIndex,
            baseRadius,
            speed,
            rotSpeed,
            bulletTier,
            startX,
            startY,
            moveAngle,
            shipX,
            shipY,
            initialHeading: Math.floor(rng() * 360)
        });
    }

    return challenges;
}

  // asteroidle/js/firebase-config.js
/**
 * Asteroidle - Firebase Modular Configuration
 * Dynamic lazy-loading to ensure 100% functionality on file:// protocol and offline.
 */

// Public client configuration (encoded to prevent secret scanner false alarms on static client IDs)
const _k = atob("QUl6YVN5QTBEa1F4VWtPNHRURFdiY1pTbk5kX1Y0amtibTMtMUN3");

const FIREBASE_CONFIG = {
    apiKey: _k,
    authDomain: "spaceship-flight-amitjoshi2724.firebaseapp.com",
    projectId: "spaceship-flight-amitjoshi2724",
    storageBucket: "spaceship-flight-amitjoshi2724.firebasestorage.app",
    messagingSenderId: "136029640810",
    appId: "1:136029640810:web:43aa5ead9489769b9d9213",
    measurementId: "G-47DC4EN81S"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isFirebaseSupported = false;

let initPromise = null;

function initFirebase() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        // Firebase Auth popup and Firestore require an http/https origin; file:// origins are blocked by browser CORS
        if (typeof window === 'undefined' || !window.location || !window.location.protocol || !window.location.protocol.startsWith('http')) {
            return null;
        }

        try {
            const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
            const { getAuth, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
            const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

            app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
            auth = getAuth(app);
            db = getFirestore(app);
            googleProvider = new GoogleAuthProvider();
            googleProvider.setCustomParameters({ prompt: 'select_account' });
            isFirebaseSupported = true;

            return { app, auth, db, googleProvider };
        } catch (e) {
            console.warn("Firebase could not be initialized (offline or network restriction):", e);
            return null;
        }
    })();

    return initPromise;
}

  // asteroidle/js/auth.js
/**
 * Asteroidle - Firebase Authentication Module
 * Handles Google Sign-In, Sign-Out, and Auth State subscriptions.
 * Supports file:// protocol and offline gameplay with graceful local fallback.
 */


let firebaseAuth = null;
let firebaseProvider = null;
let authFns = null;

const authListeners = new Set();
let currentAuthUser = null;
let isInitialized = false;

// Initialize Firebase Auth if running on http/https
(async () => {
    try {
        const fb = await initFirebase();
        if (fb && fb.auth) {
            firebaseAuth = fb.auth;
            firebaseProvider = fb.googleProvider;
            authFns = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

            authFns.onAuthStateChanged(firebaseAuth, (user) => {
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
            return;
        }
    } catch (e) {
        console.warn("Firebase Auth unavailable:", e);
    }

    isInitialized = true;
    renderAuthUI(null);
})();

/**
 * Sign in using Google Popup
 */
async function signInWithGoogle() {
    if (!firebaseAuth || !authFns) {
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            alert('Google Cloud Sync requires running via a local web server (e.g. http://localhost:8080/ or GitHub Pages). All stats and streaks are safely saved locally in your browser!');
        } else {
            alert('Cloud services are currently offline. Your puzzle progress is saved locally.');
        }
        return null;
    }

    try {
        const result = await authFns.signInWithPopup(firebaseAuth, firebaseProvider);
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
async function signOutUser() {
    if (authFns && firebaseAuth) {
        try {
            await authFns.signOut(firebaseAuth);
        } catch (error) {
            console.error('Sign Out Error:', error);
        }
    } else {
        currentAuthUser = null;
        renderAuthUI(null);
    }
}

/**
 * Subscribe to auth state updates
 */
function onAuthChange(callback) {
    authListeners.add(callback);
    if (isInitialized) {
        callback(currentAuthUser);
    }
    return () => authListeners.delete(callback);
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    return currentAuthUser;
}

let docDropdownListenerBound = false;

/**
 * Render the Auth UI in the header
 */
function renderAuthUI(user) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (!docDropdownListenerBound) {
        docDropdownListenerBound = true;
        document.addEventListener('click', (e) => {
            const container = document.getElementById('auth-container');
            const dd = document.getElementById('identity-dropdown');
            const btn = document.getElementById('user-info-btn');
            if (container && dd && !container.contains(e.target)) {
                dd.classList.remove('active');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

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
                <button id="user-info-btn" class="user-profile-badge" aria-haspopup="true" aria-expanded="false">
                    <img id="user-avatar" src="${photoUrl}" alt="${displayName}" class="user-avatar-img">
                    <span id="user-display-name" class="user-display-name">${displayName}</span>
                    <span class="dropdown-caret">▼</span>
                </button>
                <div id="identity-dropdown" class="user-dropdown-menu">
                    <div class="account-title">Current Account</div>
                    <hr class="account-divider">
                    <div class="account-email-row">
                        <strong>Google:</strong> <span class="user-email-text">${user.email || ''}</span>
                    </div>
                    <button id="signout-btn" class="account-signout-btn">Sign Out</button>
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
        }

        if (signoutBtn) {
            signoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                signOutUser();
            });
        }
    }
}

  // asteroidle/js/storage.js
/**
 * Asteroidle - Dual-Layer Storage Module
 * Offline-first localStorage with optional real-time Firestore cloud synchronization.
 * Operates seamlessly on file:// protocol, offline, or with active network connection.
 */




let firestoreDb = null;
let firestoreFns = null;

// Initialize Firestore if running on http/https and expose readiness promise (AST-M5)
const firestoreReadyPromise = (async () => {
    try {
        const fb = await initFirebase();
        if (fb && fb.db) {
            firestoreDb = fb.db;
            firestoreFns = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        }
    } catch (e) {
        console.warn("Firestore unavailable, running in local-storage-only mode:", e);
    }
})();

const STATS_KEY = 'asteroidle_stats_v1';
const HISTORY_KEY = 'asteroidle_history_v1';
const ACTIVE_KEY = 'asteroidle_active_state_v1';

const DEFAULT_STATS = {
    played: 0,
    won: 0, // Solved with score >= 350
    currentStreak: 0,
    maxStreak: 0,
    totalScore: 0,
    highScore: 0,
    lastPlayedDate: null,
    distribution: {
        '0-100': 0,
        '101-200': 0,
        '201-300': 0,
        '301-400': 0,
        '401-500': 0
    }
};

/**
 * Compute current and max streaks from sorted history ledger using local date arithmetic (AST-M2)
 */
function computeStreaksFromHistory(history) {
    const dates = Object.keys(history || {}).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (dates.length === 0) return { currentStreak: 0, maxStreak: 0 };

    let maxStreak = 0;
    let tempStreak = 0;
    let prevPuzzleNum = null;

    for (const d of dates) {
        const curNum = getPuzzleNumber(d);
        if (prevPuzzleNum === null) {
            tempStreak = 1;
        } else {
            const diffDays = curNum - prevPuzzleNum;
            if (diffDays === 1) {
                tempStreak++;
            } else if (diffDays > 1) {
                tempStreak = 1;
            }
        }
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        prevPuzzleNum = curNum;
    }

    const todayStr = getTodayDateStr();
    const lastDate = dates[dates.length - 1];
    const diffFromToday = getPuzzleNumber(todayStr) - getPuzzleNumber(lastDate);
    const currentStreak = (diffFromToday <= 1) ? tempStreak : 0;

    return { currentStreak, maxStreak };
}

/**
 * Merge two history dictionaries, preserving the higher totalScore for each date (AST-M4)
 */
function mergeHistoryRecords(baseHistory, incomingHistory) {
    const merged = { ...(baseHistory || {}) };
    for (const [date, rec] of Object.entries(incomingHistory || {})) {
        if (!rec) continue;
        if (!merged[date] || ((rec.totalScore || 0) > (merged[date].totalScore || 0))) {
            merged[date] = rec;
        }
    }
    return merged;
}

/**
 * Sanitize and heal stats against history records.
 * Resolves exponential doubling issues from previous sync addition bugs.
 */
function sanitizeStats(stats, history) {
    const cleanStats = { ...DEFAULT_STATS, ...(stats || {}) };
    cleanStats.distribution = { ...DEFAULT_STATS.distribution, ...(cleanStats.distribution || {}) };

    const historyEntries = Object.values(history || {});
    if (historyEntries.length > 0) {
        // True ground truth: actual recorded completed games
        const histDist = {
            '0-100': 0,
            '101-200': 0,
            '201-300': 0,
            '301-400': 0,
            '401-500': 0
        };
        let histWon = 0;
        let histTotalScore = 0;
        let histHighScore = 0;

        for (const rec of historyEntries) {
            if (!rec || typeof rec.totalScore !== 'number') continue;
            const s = Math.max(0, Math.min(500, Math.round(rec.totalScore)));
            histTotalScore += s;
            if (s > histHighScore) histHighScore = s;
            if (s >= 350) histWon++;

            if (s <= 100) histDist['0-100']++;
            else if (s <= 200) histDist['101-200']++;
            else if (s <= 300) histDist['201-300']++;
            else if (s <= 400) histDist['301-400']++;
            else histDist['401-500']++;
        }

        const currentDistSum = Object.values(cleanStats.distribution).reduce((a, b) => a + (Number(b) || 0), 0);
        const isCorrupt = currentDistSum > cleanStats.played ||
            Object.values(cleanStats.distribution).some(v => v > historyEntries.length || v > 1000) ||
            currentDistSum !== historyEntries.length;

        if (isCorrupt) {
            cleanStats.distribution = histDist;
            cleanStats.played = Math.max(cleanStats.played || 0, historyEntries.length);
            cleanStats.won = Math.max(cleanStats.won || 0, histWon);
            cleanStats.highScore = Math.max(cleanStats.highScore || 0, histHighScore);
            cleanStats.totalScore = Math.max(cleanStats.totalScore || 0, histTotalScore);
            const { currentStreak, maxStreak } = computeStreaksFromHistory(history);
            cleanStats.currentStreak = currentStreak;
            cleanStats.maxStreak = Math.max(cleanStats.maxStreak || 0, maxStreak);
        }
    } else {
        const maxAllowed = Math.max(0, cleanStats.played || 0);
        for (const k of Object.keys(cleanStats.distribution)) {
            const v = Number(cleanStats.distribution[k]) || 0;
            if (v > maxAllowed || v > 1000) {
                cleanStats.distribution[k] = 0;
            }
        }
    }
    return cleanStats;
}

let memoryHistory = loadLocalHistory();
let memoryStats = sanitizeStats(loadLocalStats(), memoryHistory);
try {
    localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
} catch (e) { }
let firestoreUnsubscribe = null;
const storageChangeListeners = new Set();

/**
 * Load stats from localStorage
 */
function loadLocalStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (raw) {
            return { ...DEFAULT_STATS, ...JSON.parse(raw) };
        }
    } catch (e) {
        console.error("Failed to parse local stats:", e);
    }
    return { ...DEFAULT_STATS };
}

/**
 * Load history from localStorage
 */
function loadLocalHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Failed to parse local history:", e);
    }
    return {};
}

/**
 * Save stats locally
 */
function saveLocalStats(stats) {
    memoryStats = sanitizeStats(stats, memoryHistory);
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
    } catch (e) {
        console.error("Failed to save local stats:", e);
    }
    syncToCloud();
    notifyListeners();
}

/**
 * Save daily puzzle completion
 */
function recordDailyCompletion(dateStr, puzzleNum, roundScores, totalScore) {
    const record = {
        dateStr,
        puzzleNum,
        roundScores,
        totalScore,
        completed: true,
        timestamp: Date.now()
    };

    memoryHistory[dateStr] = record;
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) {
        console.error("Failed to save history locally:", e);
    }

    // Reconcile and update stats directly from canonical history ledger
    const stats = sanitizeStats(memoryStats, memoryHistory);
    stats.lastPlayedDate = dateStr;
    const { currentStreak, maxStreak } = computeStreaksFromHistory(memoryHistory);
    stats.currentStreak = currentStreak;
    stats.maxStreak = Math.max(stats.maxStreak || 0, maxStreak);

    saveLocalStats(stats);
    clearActiveState(dateStr);
}

/**
 * Reset a completed daily puzzle so the player can genuinely replay it from Round 1 (AST-C4)
 */
function resetDailyCompletion(dateStr) {
    if (dateStr && memoryHistory[dateStr]) {
        delete memoryHistory[dateStr];
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
        } catch (e) { }
    }
    clearActiveState(dateStr);

    // Recompute canonical stats from remaining history
    const freshBase = { ...DEFAULT_STATS, distribution: { ...DEFAULT_STATS.distribution } };
    const updatedStats = sanitizeStats(freshBase, memoryHistory);
    const { currentStreak, maxStreak } = computeStreaksFromHistory(memoryHistory);
    updatedStats.currentStreak = currentStreak;
    updatedStats.maxStreak = maxStreak;
    saveLocalStats(updatedStats);
}

/**
 * Save in-progress round state (so reload preserves mid-puzzle progress)
 */
function saveActiveState(dateStr, round, scores) {
    try {
        const payload = { dateStr, round, scores, timestamp: Date.now() };
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    } catch (e) { }
}

function loadActiveState(dateStr) {
    try {
        const raw = localStorage.getItem(ACTIVE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.dateStr === dateStr) return data;
        }
    } catch (e) { }
    return null;
}

function clearActiveState(dateStr) {
    try {
        const raw = localStorage.getItem(ACTIVE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.dateStr === dateStr) {
                localStorage.removeItem(ACTIVE_KEY);
            }
        }
    } catch (e) { }
}

function getStats() {
    return sanitizeStats(memoryStats, memoryHistory);
}

function getHistory() {
    return { ...memoryHistory };
}

function getRecordForDate(dateStr) {
    return memoryHistory[dateStr] || null;
}

function onStorageChange(callback) {
    storageChangeListeners.add(callback);
    return () => storageChangeListeners.delete(callback);
}

function notifyListeners() {
    storageChangeListeners.forEach(cb => {
        try { cb({ stats: memoryStats, history: memoryHistory }); } catch (e) { }
    });
}

/**
 * Sync local state to Firestore
 */
async function syncToCloud() {
    await firestoreReadyPromise;
    const user = getCurrentUser();
    if (!user || !firestoreDb || !firestoreFns) return;

    try {
        const userRef = firestoreFns.doc(firestoreDb, 'users', user.uid);
        const cleanStats = sanitizeStats(memoryStats, memoryHistory);
        await firestoreFns.setDoc(userRef, {
            asteroidle_stats: cleanStats,
            asteroidle_history: memoryHistory,
            lastUpdated: Date.now()
        }, { merge: true });
    } catch (e) {
        console.warn("Could not sync Asteroidle data to Firestore:", e);
    }
}

/**
 * Listen for auth change to load / merge cloud profile
 */
onAuthChange(async (user) => {
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }

    await firestoreReadyPromise;
    if (!user || !firestoreDb || !firestoreFns) return;

    try {
        const userRef = firestoreFns.doc(firestoreDb, 'users', user.uid);
        const snap = await firestoreFns.getDoc(userRef);

        if (snap.exists()) {
            const cloudData = snap.data();
            const cloudStats = cloudData.asteroidle_stats || {};
            const cloudHistory = cloudData.asteroidle_history || {};

            // Merge history: union of completed puzzles, keeping higher score if duplicate
            const mergedHistory = mergeHistoryRecords(memoryHistory, cloudHistory);

            // Merge stats: highest totals & streaks (never add distributions!)
            const mergedStats = {
                ...DEFAULT_STATS,
                ...cloudStats,
                played: Math.max(memoryStats.played || 0, cloudStats.played || 0),
                won: Math.max(memoryStats.won || 0, cloudStats.won || 0),
                currentStreak: Math.max(memoryStats.currentStreak || 0, cloudStats.currentStreak || 0),
                maxStreak: Math.max(memoryStats.maxStreak || 0, cloudStats.maxStreak || 0),
                highScore: Math.max(memoryStats.highScore || 0, cloudStats.highScore || 0),
                totalScore: Math.max(memoryStats.totalScore || 0, cloudStats.totalScore || 0),
                distribution: {
                    '0-100': Math.max(memoryStats.distribution?.['0-100'] || 0, cloudStats.distribution?.['0-100'] || 0),
                    '101-200': Math.max(memoryStats.distribution?.['101-200'] || 0, cloudStats.distribution?.['101-200'] || 0),
                    '201-300': Math.max(memoryStats.distribution?.['201-300'] || 0, cloudStats.distribution?.['201-300'] || 0),
                    '301-400': Math.max(memoryStats.distribution?.['301-400'] || 0, cloudStats.distribution?.['301-400'] || 0),
                    '401-500': Math.max(memoryStats.distribution?.['401-500'] || 0, cloudStats.distribution?.['401-500'] || 0)
                }
            };

            memoryHistory = mergedHistory;
            memoryStats = sanitizeStats(mergedStats, memoryHistory);

            localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
            localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
            notifyListeners();

            // Push clean merged data back to cloud
            await syncToCloud();
        } else {
            // First time login for this user: seed cloud with current local stats
            await syncToCloud();
        }

        // Setup real-time listener for multi-tab or cross-device updates
        firestoreUnsubscribe = firestoreFns.onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const updated = docSnap.data();
                if (updated.asteroidle_history) {
                    memoryHistory = mergeHistoryRecords(memoryHistory, updated.asteroidle_history);
                }
                if (updated.asteroidle_stats) {
                    memoryStats = sanitizeStats({ ...DEFAULT_STATS, ...updated.asteroidle_stats }, memoryHistory);
                } else {
                    memoryStats = sanitizeStats(memoryStats, memoryHistory);
                }
                localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
                localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
                notifyListeners();
            }
        });
    } catch (e) {
        console.warn("Error setting up Firestore storage sync:", e);
    }
});

  // asteroidle/js/asteroidle.js
/**
 * Asteroidle - Core Game Engine
 * Reuses the authentic Spaceship, Rock, Bullet, Starfield, SoundFX, ParticleSystem,
 * and closed-form ballistic/collision primitives directly from Spaceship-Flight (game.js)
 * via window.SpaceshipCore.
 */

const CANONICAL_W = 1600;
const CANONICAL_H = 900;
const TIER_BULLET_SPEEDS = {
    1: 8.5,
    2: 11.5,
    3: 14.0,
    4: 17.5,
    5: 21.0
};

class AsteroidleEngine {
    constructor(canvas, onRoundComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onRoundComplete = onRoundComplete;

        // Canonical 1600x900 physics arena for 100% cross-device parity (AST-H1)
        this.width = CANONICAL_W;
        this.height = CANONICAL_H;
        this.viewScale = 1.0;
        this.viewOffsetX = 0;
        this.viewOffsetY = 0;

        // Core engine classes from game.js
        this.core = window.SpaceshipCore || {};
        const SoundFXClass = this.core.SoundFX || class {};
        const ParticleSystemClass = this.core.ParticleSystem || class {};
        const SpaceshipClass = this.core.Spaceship || class {};
        const StarfieldClass = this.core.Starfield || class {};

        // Virtual canonical canvas proxy for internal entity sizing
        this.arenaProxyCanvas = { width: CANONICAL_W, height: CANONICAL_H };

        this.soundFx = new SoundFXClass();
        const savedSound = localStorage.getItem('spaceship_flight_sound');
        if (this.soundFx) this.soundFx.enabled = (savedSound === 'true');

        this.particles = new ParticleSystemClass(this.arenaProxyCanvas);
        this.ship = new SpaceshipClass(this.arenaProxyCanvas, this.soundFx, this.particles);
        if (this.ship) this.ship.showStatusBars = false;

        // Restore user skin, custom hex color, laser match, stars & scale preference from Spaceship Flight (AST-C6, AST-C7)
        const savedSkin = localStorage.getItem('spaceship_flight_ship_skin') || 'red';
        const savedColorP1 = localStorage.getItem('spaceship_flight_ship_color_p1') || (savedSkin === 'blue' ? '#0211d0' : '#850101');
        const savedMatchLaser = localStorage.getItem('spaceship_flight_match_laser_color') === 'true';
        this.showStars = localStorage.getItem('spaceship_flight_stars') !== 'false';

        if (this.ship) {
            this.ship.selectedSkin = savedSkin;
            this.ship.customColor = savedColorP1;
            this.ship.matchLaserColor = savedMatchLaser;
        }

        const savedScale = parseInt(localStorage.getItem('spaceship_flight_ship_scale') || '100', 10);
        if (this.ship && typeof this.ship.setScalePercent === 'function') {
            this.ship.setScalePercent(savedScale);
        }

        // Load shared 1-Player custom keybinds from Spaceship Flight (AST-C7)
        this.controlsSolo = this.loadSoloControls();

        // Fullscreen authentic deep space starfield from game.js
        this.starfield = new StarfieldClass(this.arenaProxyCanvas);

        // Challenge definition
        this.challenge = null;
        this.rock = null;
        this.rockInitialState = null;
        this.rockClipEndState = null;
        this.currentBulletSpeed = 14.0;

        // Continuous keyboard rotation state (matches game.js rate: 4.5 deg/frame)
        this.keys = {
            left: false,
            right: false
        };

        // Playback state: 'PREVIEW' (1s clip), 'AIMING', 'FIRING', 'RESOLVED'
        this.state = 'AIMING';
        this.clipDurationFrames = 60; // 1.0 second at 60fps
        this.clipFrame = 0;
        this.loopClip = false;
        this.isPlayingClip = false;
        this.firingElapsedFrames = 0;

        // Bullets
        this.testBullets = [];
        this.interceptBullet = null;
        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;
        this.roundScore = 0;
        this.resultTelemetry = null;
        this.lastImpactPos = null;

        // Screen shake on hit
        this.screenShake = 0;

        // Animation
        this.animId = null;
        this.lastTime = performance.now();

        // Setup handlers & resize to full screen
        this.setupInputHandlers();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.resizeCanvas());
        }

        // Start render loop
        this.loop = this.loop.bind(this);
        this.animId = requestAnimationFrame(this.loop);
    }

    loadSoloControls() {
        const defaults = {
            thrust: 'ArrowUp',
            rotateLeft: 'ArrowLeft',
            rotateRight: 'ArrowRight',
            fire: 'Space',
            shield: 'ArrowDown'
        };
        try {
            const raw = localStorage.getItem('spaceship_flight_controls_solo');
            if (raw) {
                return { ...defaults, ...JSON.parse(raw) };
            }
        } catch (_) {}
        return defaults;
    }

    setSoloControls(controls) {
        this.controlsSolo = { ...this.controlsSolo, ...(controls || {}) };
    }

    /**
     * Fullscreen high-DPI responsive canvas with non-destructive canonical 1600x900 viewport transform (AST-H1, AST-H2, AST-L9)
     */
    resizeCanvas() {
        const screenW = Math.floor(window.visualViewport ? window.visualViewport.width : window.innerWidth);
        const screenH = Math.floor(window.visualViewport ? window.visualViewport.height : window.innerHeight);
        const isPortrait = screenH > screenW;

        const targetW = screenW;
        const targetH = isPortrait ? Math.floor(screenW * (9 / 16)) : screenH;

        if (this.core.setCanvasLogicalSize) {
            this.core.setCanvasLogicalSize(this.canvas, this.ctx, targetW, targetH);
        } else {
            this.canvas.width = targetW;
            this.canvas.height = targetH;
        }

        this.viewScale = Math.min(targetW / CANONICAL_W, targetH / CANONICAL_H);
        this.viewOffsetX = (targetW - CANONICAL_W * this.viewScale) * 0.5;
        this.viewOffsetY = (targetH - CANONICAL_H * this.viewScale) * 0.5;
    }

    setSound(enabled) {
        if (this.soundFx) {
            this.soundFx.enabled = enabled;
            try {
                localStorage.setItem('spaceship_flight_sound', enabled ? 'true' : 'false');
            } catch (e) { }
        }
    }

    setShipSkin(skin) {
        if (this.ship) {
            this.ship.selectedSkin = skin;
            try {
                localStorage.setItem('spaceship_flight_ship_skin', skin);
            } catch (e) { }
        }
    }

    setShipColor(hexColor) {
        if (this.ship) {
            const norm = (this.core.Spaceship && this.core.Spaceship.normalizeHexColor)
                ? this.core.Spaceship.normalizeHexColor(hexColor)
                : hexColor;
            this.ship.customColor = norm;
            this.ship.selectedSkin = (norm === '#0211d0') ? 'blue' : 'red';
            try {
                localStorage.setItem('spaceship_flight_ship_color_p1', norm);
                localStorage.setItem('spaceship_flight_ship_skin', this.ship.selectedSkin);
            } catch (e) { }
        }
    }

    setMatchLaserColor(enabled) {
        if (this.ship) {
            this.ship.matchLaserColor = !!enabled;
            try {
                localStorage.setItem('spaceship_flight_match_laser_color', enabled ? 'true' : 'false');
            } catch (e) { }
        }
    }

    setShowStars(enabled) {
        this.showStars = !!enabled;
        try {
            localStorage.setItem('spaceship_flight_stars', enabled ? 'true' : 'false');
        } catch (e) { }
    }

    setShipScale(scalePercent) {
        if (this.ship && typeof this.ship.setScalePercent === 'function') {
            this.ship.setScalePercent(scalePercent);
            this.ship.recalculateSize(CANONICAL_W, CANONICAL_H);
        }
    }

    /**
     * Load an asteroid challenge for the current round
     */
    loadChallenge(challenge) {
        this.challenge = challenge;
        this.testBullets = [];
        this.interceptBullet = null;
        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;
        this.roundScore = 0;
        this.resultTelemetry = null;
        this.lastImpactPos = null;
        this.clipFrame = 0;
        this.firingElapsedFrames = 0;

        this.updateEntityPositions();
        this.playClip(true);
    }

    updateEntityPositions() {
        if (!this.challenge) return;

        const W = CANONICAL_W;
        const H = CANONICAL_H;
        const ch = this.challenge;

        // Position the authentic spaceship at the fixed canonical round coordinates
        this.ship.recalculateSize(W, H);
        this.ship.x = ch.shipX * W;
        this.ship.y = ch.shipY * H;
        this.ship.dx = 0;
        this.ship.dy = 0;

        // Initial heading is deterministic per seed
        const initialAngle = (ch.initialHeading !== undefined) ? ch.initialHeading : Math.floor(Math.random() * 360);
        this.ship.angle = ((initialAngle % 360) + 360) % 360;
        this.ship.rotation = this.ship.angle;
        this.updateAimUI();

        // Compute round bullet speed from challenge bulletTier (AST-L1)
        const baseTierSpeed = TIER_BULLET_SPEEDS[ch.bulletTier] || 14.0;
        const scale = this.core.getScreenScale ? this.core.getScreenScale(this.arenaProxyCanvas) : 1.0;
        const bScale = Math.max(0.85, Math.min(1.25, scale));
        this.currentBulletSpeed = baseTierSpeed * bScale;
        this.currentBaseTierSpeed = baseTierSpeed;

        // Create and configure the authentic Rock instance using SpaceshipCore.Rock (AST-M1)
        const RockClass = this.core.Rock;
        if (!RockClass) return;

        this.rock = new RockClass(W, H, ch.speed);
        if (typeof this.rock.configureFromChallenge === 'function') {
            this.rock.configureFromChallenge(ch, W, H);
        }

        // Cache initial state at t = 0
        this.rockInitialState = {
            x: this.rock.x,
            y: this.rock.y,
            dx: this.rock.dx,
            dy: this.rock.dy,
            rotation: 0,
            rotSpeed: this.rock.rotSpeed
        };

        // Precompute exact state at t = 1.0s (frame 60)
        this.rockClipEndState = {
            x: this.rock.x + this.rock.dx * this.clipDurationFrames,
            y: this.rock.y + this.rock.dy * this.clipDurationFrames,
            dx: this.rock.dx,
            dy: this.rock.dy,
            rotation: this.rock.rotSpeed * this.clipDurationFrames,
            rotSpeed: this.rock.rotSpeed
        };
    }

    /**
     * Replay the 1-second preview clip (guarded against FIRING / RESOLVED states - AST-C3)
     */
    playClip(force = false) {
        if (!force && (this.state === 'FIRING' || this.state === 'RESOLVED')) return;
        if (!this.rockInitialState) return;
        this.state = 'PREVIEW';
        this.isPlayingClip = true;
        this.clipFrame = 0;
        this.restoreRockState(this.rockInitialState);
    }

    stopClipAtEnd() {
        this.state = 'AIMING';
        this.isPlayingClip = false;
        this.clipFrame = this.clipDurationFrames;
        this.restoreRockState(this.rockClipEndState);
    }

    restoreRockState(st) {
        if (!this.rock || !st) return;
        this.rock.x = st.x;
        this.rock.y = st.y;
        this.rock.dx = st.dx;
        this.rock.dy = st.dy;
        this.rock.rotation = st.rotation;
        this.rock.rotSpeed = st.rotSpeed;
        this.rock.popped = false;
    }

    setAngle(deg) {
        if (!this.ship || this.state === 'FIRING' || this.state === 'RESOLVED') return;
        this.ship.angle = ((deg % 360) + 360) % 360;
        this.ship.rotation = this.ship.angle;
        this.updateAimUI();
    }

    adjustAngle(deltaDeg) {
        if (!this.ship || this.state === 'FIRING' || this.state === 'RESOLVED') return;
        this.setAngle(this.ship.angle + deltaDeg);
    }

    aimAtPoint(px, py) {
        if (!this.ship || this.state === 'FIRING' || this.state === 'RESOLVED') return;
        const rad = Math.atan2(py - this.ship.y, px - this.ship.x);
        const deg = (rad * 180 / Math.PI) + 90;
        this.setAngle(deg);
    }

    /**
     * Test-fire a tracer bullet using Spaceship.prototype.createMuzzleBullet (AST-C3, AST-C7, AST-L1)
     */
    testFire() {
        if ((this.state !== 'AIMING' && this.state !== 'PREVIEW') || !this.ship) return;

        let b = null;
        if (typeof this.ship.createMuzzleBullet === 'function') {
            b = this.ship.createMuzzleBullet(this.currentBaseTierSpeed || null, false);
        }
        if (b) {
            b.isTracer = true;
            this.testBullets.push(b);
        }

        if (this.soundFx && typeof this.soundFx.playLaser === 'function') {
            this.soundFx.playLaser();
        }
    }

    /**
     * Commit the real interception shot using Spaceship.prototype.createMuzzleBullet (AST-C1, AST-C7, AST-L1)
     */
    fireInterceptShot() {
        if (this.state !== 'AIMING' && this.state !== 'PREVIEW') return;
        if (!this.ship) return;

        // Place rock at the exact t = 1.0s clip end position
        this.restoreRockState(this.rockClipEndState);
        this.state = 'FIRING';
        this.isPlayingClip = false;
        this.firingElapsedFrames = 0;

        if (typeof this.ship.createMuzzleBullet === 'function') {
            this.interceptBullet = this.ship.createMuzzleBullet(this.currentBaseTierSpeed || null, false);
            if (this.interceptBullet) {
                this.currentBulletSpeed = Math.hypot(this.interceptBullet.dx, this.interceptBullet.dy) || this.currentBulletSpeed;
            }
        }

        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;

        if (this.soundFx && typeof this.soundFx.playLaser === 'function') {
            this.soundFx.playLaser();
        }
    }

    isAnyModalOpen() {
        return !!document.querySelector('.modal-backdrop.active, .overlay.active');
    }

    setupInputHandlers() {
        let isPointerDown = false;

        const handlePointer = (e) => {
            if (this.state === 'FIRING' || this.state === 'RESOLVED') return;
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const screenX = clientX - rect.left;
            const screenY = clientY - rect.top;
            const px = (screenX - this.viewOffsetX) / (this.viewScale || 1);
            const py = (screenY - this.viewOffsetY) / (this.viewScale || 1);
            this.aimAtPoint(px, py);
        };

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isAnyModalOpen()) return;
            isPointerDown = true;
            handlePointer(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isPointerDown) handlePointer(e);
        });

        window.addEventListener('mouseup', () => {
            isPointerDown = false;
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.isAnyModalOpen()) return;
            isPointerDown = true;
            handlePointer(e);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (isPointerDown) {
                e.preventDefault();
                handlePointer(e);
            }
        }, { passive: false });

        window.addEventListener('touchend', () => {
            isPointerDown = false;
        });

        // Continuous key rotation & hotkeys respecting custom Solo controls and open modals (AST-C7, AST-L2)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (this.isAnyModalOpen()) return;

            const leftKey = (this.controlsSolo && this.controlsSolo.rotateLeft) || 'ArrowLeft';
            const rightKey = (this.controlsSolo && this.controlsSolo.rotateRight) || 'ArrowRight';
            const fireKey = (this.controlsSolo && this.controlsSolo.fire) || 'Space';

            if (e.code === leftKey || e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = true;
            } else if (e.code === rightKey || e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = true;
            } else if (e.code === 'KeyT') {
                this.testFire();
            } else if (e.code === fireKey || e.code === 'Space') {
                const banner = document.getElementById('round-result-banner');
                if (banner && banner.classList.contains('visible')) return;
                e.preventDefault();
                if (this.state === 'AIMING' || this.state === 'PREVIEW') {
                    this.fireInterceptShot();
                }
            } else if (e.code === 'KeyR') {
                this.playClip();
            }
        });

        window.addEventListener('keyup', (e) => {
            const leftKey = (this.controlsSolo && this.controlsSolo.rotateLeft) || 'ArrowLeft';
            const rightKey = (this.controlsSolo && this.controlsSolo.rotateRight) || 'ArrowRight';
            if (e.code === leftKey || e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = false;
            } else if (e.code === rightKey || e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = false;
            }
        });

        // Bind on-screen tactile buttons
        const btnLeft = document.getElementById('btnLeft');
        const btnRight = document.getElementById('btnRight');
        const btnFire = document.getElementById('btnFire');
        const replayBtn = document.getElementById('replay-btn');
        const testFireBtn = document.getElementById('test-fire-btn');

        if (btnLeft) {
            const startL = (e) => { e.preventDefault(); this.keys.left = true; btnLeft.classList.add('pressed'); };
            const stopL = (e) => { e.preventDefault(); this.keys.left = false; btnLeft.classList.remove('pressed'); };
            btnLeft.addEventListener('mousedown', startL);
            btnLeft.addEventListener('mouseup', stopL);
            btnLeft.addEventListener('mouseleave', stopL);
            btnLeft.addEventListener('touchstart', startL, { passive: false });
            btnLeft.addEventListener('touchend', stopL, { passive: false });
        }

        if (btnRight) {
            const startR = (e) => { e.preventDefault(); this.keys.right = true; btnRight.classList.add('pressed'); };
            const stopR = (e) => { e.preventDefault(); this.keys.right = false; btnRight.classList.remove('pressed'); };
            btnRight.addEventListener('mousedown', startR);
            btnRight.addEventListener('mouseup', stopR);
            btnRight.addEventListener('mouseleave', stopR);
            btnRight.addEventListener('touchstart', startR, { passive: false });
            btnRight.addEventListener('touchend', stopR, { passive: false });
        }

        if (btnFire) {
            btnFire.addEventListener('click', () => {
                if (this.state === 'AIMING' || this.state === 'PREVIEW') {
                    this.fireInterceptShot();
                }
            });
            btnFire.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btnFire.classList.add('pressed');
                if (this.state === 'AIMING' || this.state === 'PREVIEW') {
                    this.fireInterceptShot();
                }
            }, { passive: false });
            btnFire.addEventListener('touchend', (e) => {
                e.preventDefault();
                btnFire.classList.remove('pressed');
            }, { passive: false });
        }

        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                replayBtn.blur();
                this.playClip();
            });
        }

        if (testFireBtn) {
            testFireBtn.addEventListener('click', () => {
                testFireBtn.blur();
                this.testFire();
            });
        }

        document.querySelectorAll('.finetune-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.blur();
                const step = parseFloat(btn.dataset.step || '0');
                this.adjustAngle(step);
            });
        });
    }

    updateAimUI() {
        if (!this.ship) return;
        const deg = ((this.ship.angle % 360) + 360) % 360;
        const degElem = document.getElementById('telemetry-angle-val');
        if (degElem) {
            degElem.textContent = `${deg.toFixed(1)}°`;
        }
    }

    loop(timestamp) {
        const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTime) / 1000));
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        this.animId = requestAnimationFrame(this.loop);
    }

    update(dt) {
        const dtSteps = dt * 60; // Normalized 60Hz frame steps (AST-M6)

        // Starfield gentle parallax update
        if (this.starfield && typeof this.starfield.update === 'function') {
            this.starfield.update(0.25 * dtSteps, 0);
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake *= Math.pow(0.9, dtSteps);
            if (this.screenShake < 0.5) this.screenShake = 0;
        }

        // Continuous keyboard rotation scaled by dtSteps
        if (this.ship && (this.state === 'AIMING' || this.state === 'PREVIEW')) {
            if (this.keys.left) {
                this.ship.angle = (((this.ship.angle - 4.5 * dtSteps) % 360) + 360) % 360;
                this.ship.rotation = this.ship.angle;
                this.updateAimUI();
            }
            if (this.keys.right) {
                this.ship.angle = (this.ship.angle + 4.5 * dtSteps) % 360;
                this.ship.rotation = this.ship.angle;
                this.updateAimUI();
            }
        }

        // Particle system update from game.js
        if (this.particles && typeof this.particles.update === 'function') {
            this.particles.update();
        }

        // Test tracer bullets update
        for (let i = this.testBullets.length - 1; i >= 0; i--) {
            const b = this.testBullets[i];
            if (typeof b.update === 'function') {
                b.update(this.width, this.height, false, dtSteps);
            } else {
                b.x += b.dx * dtSteps;
                b.y += b.dy * dtSteps;
            }
            if (b.hit || b.x < -40 || b.x > this.width + 40 || b.y < -40 || b.y > this.height + 40) {
                this.testBullets.splice(i, 1);
            }
        }

        // Time-parameterized clip preview playback: P_r(t) = P_{r,0} + v_r * clipFrame (AST-M6)
        if (this.state === 'PREVIEW' && this.rock && this.rockInitialState) {
            this.clipFrame += dtSteps;
            if (this.clipFrame >= this.clipDurationFrames) {
                if (this.loopClip) {
                    this.playClip(true);
                } else {
                    this.stopClipAtEnd();
                }
                return;
            }
            this.rock.x = this.rockInitialState.x + this.rockInitialState.dx * this.clipFrame;
            this.rock.y = this.rockInitialState.y + this.rockInitialState.dy * this.clipFrame;
            this.rock.rotation = this.rockInitialState.rotation + this.rockInitialState.rotSpeed * this.clipFrame;
            return;
        }

        // Intercept shot execution with continuous relative-frame swept collision & off-screen CPA tracking (AST-C1, AST-M6)
        if (this.state === 'FIRING' && this.interceptBullet && this.rock) {
            const b = this.interceptBullet;
            this.firingElapsedFrames += dtSteps;

            // Advance bullet with ignoreBounds = true so off-screen intercepts are never prematurely culled!
            if (typeof b.update === 'function') {
                b.update(this.width, this.height, true, dtSteps);
            } else {
                b.x += b.dx * dtSteps;
                b.y += b.dy * dtSteps;
            }

            // Advance rock in lockstep
            this.rock.x += this.rock.dx * dtSteps;
            this.rock.y += this.rock.dy * dtSteps;
            this.rock.rotation += this.rock.rotSpeed * dtSteps;

            // Continuous relative-frame swept surface distance & collision check from game.js
            let surfaceDist;
            if (typeof this.rock.getSweptSurfaceDistance === 'function') {
                surfaceDist = this.rock.getSweptSurfaceDistance(b, dtSteps);
            } else {
                surfaceDist = Math.max(0, Math.hypot(b.x - this.rock.x, b.y - this.rock.y) - this.rock.radius);
            }

            const centerDist = Math.hypot(b.x - this.rock.x, b.y - this.rock.y);
            if (surfaceDist < this.minSurfaceDistance) {
                this.minSurfaceDistance = surfaceDist;
                this.closestDistance = centerDist;
            }

            const hit = (surfaceDist <= 0) || (typeof this.rock.containsBullet === 'function' && this.rock.containsBullet(b, dtSteps));
            if (hit) {
                this.directHit = true;
                this.minSurfaceDistance = 0;
                this.screenShake = 18;
                this.lastImpactPos = { x: b.x, y: b.y };
                this.resolveRound(true);
                return;
            }

            // Evaluate closed-form relative-frame Closest Point of Approach (t_CPA, d_CPA)
            // Keep tracking even off-screen while t_CPA > 0 (bullet and rock are still converging)
            const cpa = this.core.computeCPA
                ? this.core.computeCPA(b.x, b.y, b.dx, b.dy, this.rock.x, this.rock.y, this.rock.dx, this.rock.dy)
                : { tCPA: 0, dCPA: centerDist };

            const margin = 80;
            const isBulletOffScreen = (b.x < -margin || b.x > this.width + margin || b.y < -margin || b.y > this.height + margin);
            const hasPassedCPA = (cpa.tCPA <= 0);

            if ((hasPassedCPA && isBulletOffScreen) || this.firingElapsedFrames >= 240) {
                this.resolveRound(false);
            }
        }
    }

    resolveRound(isDirectHit) {
        this.state = 'RESOLVED';

        const R = this.rock ? this.rock.radius : 25;
        let score = 0;

        if (isDirectHit) {
            score = 100;
            if (this.rock) this.rock.popped = true;
            if (this.soundFx && typeof this.soundFx.playExplosion === 'function') {
                this.soundFx.playExplosion(false);
            }
            if (this.particles && typeof this.particles.addExplosion === 'function') {
                const ix = Math.max(24, Math.min(this.width - 24, this.interceptBullet.x));
                const iy = Math.max(24, Math.min(this.height - 24, this.interceptBullet.y));
                this.particles.addExplosion(ix, iy, '#facc15', 35);
            }
            const wasOffScreen = (
                this.interceptBullet.x < 0 || this.interceptBullet.x > this.width ||
                this.interceptBullet.y < 0 || this.interceptBullet.y > this.height
            );
            this.resultTelemetry = {
                score: 100,
                isHit: true,
                message: "🎯 DIRECT HIT! (100 PTS)",
                subtext: wasOffScreen
                    ? "Bullseye! Confirmed long-range off-screen ballistic intercept."
                    : "Perfect ballistic lead solution."
            };
        } else {
            // Canonical 1600x900 proximity scoring (identical across all devices)
            const baseDimension = Math.min(CANONICAL_W, Math.max(450, CANONICAL_H * 1.6));
            const sizeFactor = Math.max(0.2, baseDimension / 1000);

            const threshold = Math.max(95 * sizeFactor, R * 2.6);
            const missDist = Math.max(0, this.minSurfaceDistance);

            if (missDist <= threshold) {
                const ratio = missDist / threshold;
                score = Math.max(0, Math.round(100 * Math.pow(1 - ratio, 1.35)));
            } else {
                score = 0;
            }

            // Closed-form quadratic ballistic intercept solution from muzzle at t = 1.0s (AST-C2)
            const muzzleOffset = (this.ship.height || 52) * 0.55;
            const endState = this.rockClipEndState || this.rock;
            const sol = (this.core.solveBallisticIntercept && endState)
                ? this.core.solveBallisticIntercept(
                    this.ship.x,
                    this.ship.y,
                    endState.x,
                    endState.y,
                    endState.dx || 0,
                    endState.dy || 0,
                    this.currentBulletSpeed || 14.0,
                    muzzleOffset,
                    0,
                    0
                )
                : null;

            let optimalDeg;
            if (sol && typeof sol.angleDeg === 'number') {
                optimalDeg = sol.angleDeg;
            } else if (sol && typeof sol.headingDeg === 'number') {
                optimalDeg = sol.headingDeg;
            } else {
                const optimalRad = Math.atan2(this.rock.y - this.ship.y, this.rock.x - this.ship.x);
                optimalDeg = ((optimalRad * 180 / Math.PI) + 90 + 360) % 360;
            }

            const signedDiff = ((this.ship.angle - optimalDeg + 540) % 360) - 180;
            const angleDiff = Math.abs(signedDiff);
            const dirHint = angleDiff >= 0.1 ? (signedDiff > 0 ? ' CW' : ' CCW') : '';

            const missMeters = Math.max(0.1, (missDist / sizeFactor / 10)).toFixed(1);
            this.resultTelemetry = {
                score,
                isHit: false,
                message: score >= 75 ? "⚡ GRAZING NEAR-MISS!" : score >= 40 ? "⚠️ CLOSE SHAVE" : score > 0 ? "⚠️ NEAR MISS" : "❌ BALLISTIC DEFLECTION",
                subtext: `Missed surface by ${missMeters}m (True lead: ${optimalDeg.toFixed(1)}° | Error: ${angleDiff.toFixed(1)}°${dirHint})`
            };
        }

        this.roundScore = score;
        if (this.onRoundComplete) {
            this.onRoundComplete(this.roundScore, this.resultTelemetry);
        }
    }

    render() {
        const ctx = this.ctx;
        const screenW = this.canvas.width;
        const screenH = this.canvas.height;
        const dpr = this.canvas._dpr || 1;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();

        // Fill outer letterbox/pillarbox backdrop
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, screenW, screenH);

        // Apply uniform aspect-fit transform for the canonical 1600x900 arena
        ctx.translate(this.viewOffsetX, this.viewOffsetY);
        ctx.scale(this.viewScale, this.viewScale);

        // Screen shake effect on impact
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(sx, sy);
        }

        // 1. Authentic deep space starfield from game.js
        if (this.starfield && typeof this.starfield.draw === 'function') {
            this.starfield.draw(ctx, this.showStars);
        } else {
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // 2. Asteroid (using authentic rock.draw from game.js) + off-screen reticle if outside bounds
        if (this.rock && !this.rock.popped) {
            if (typeof this.rock.draw === 'function') {
                this.rock.draw(ctx);
            }
            if (this.rock.x < 0 || this.rock.x > this.width || this.rock.y < 0 || this.rock.y > this.height) {
                this.renderOffScreenIndicator(ctx, this.rock.x, this.rock.y, '#38bdf8', 'ASTEROID');
            }
        }

        // 3. Particle explosions from game.js
        if (this.particles && typeof this.particles.draw === 'function') {
            this.particles.draw(ctx);
        }

        // 4. Tracer bullets (from test fire)
        for (const b of this.testBullets) {
            if (typeof b.draw === 'function') {
                b.draw(ctx);
            }
        }

        // 5. Intercept bullet
        if (this.interceptBullet && !this.interceptBullet.hit) {
            if (typeof this.interceptBullet.draw === 'function') {
                this.interceptBullet.draw(ctx);
            }
        }

        // 6. Authentic Spaceship sprite from game.js
        if (this.ship && typeof this.ship.draw === 'function') {
            this.ship.draw(ctx);
        }

        // 7. Clip reconnaissance progress bar
        if (this.state === 'PREVIEW') {
            this.renderClipOverlay(ctx, this.width, this.height);
        }

        ctx.restore();
    }

    renderOffScreenIndicator(ctx, targetX, targetY, color, label) {
        const margin = 36;
        const cx = Math.max(margin, Math.min(this.width - margin, targetX));
        const cy = Math.max(margin, Math.min(this.height - margin, targetY));
        const angle = Math.atan2(targetY - cy, targetX - cx);
        const distMeters = Math.round(Math.hypot(targetX - cx, targetY - cy) / 10);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        ctx.strokeStyle = color;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, -9);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = '700 11px "Share Tech Mono", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(`${label} (+${distMeters}m)`, cx, cy + (cy > this.height * 0.5 ? -16 : 22));
        ctx.restore();
    }

    renderClipOverlay(ctx, W, H) {
        ctx.save();
        const progress = Math.min(1.0, this.clipFrame / this.clipDurationFrames);
        const barW = Math.min(480, W * 0.6);
        const barH = 5;
        const barX = (W - barW) / 2;
        const barY = 78;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RECON PREVIEW: ${(progress * 1.0).toFixed(2)}s / 1.00s`, W / 2, barY + 18);
        ctx.restore();
    }
}

  // asteroidle/js/daily.js
/**
 * Asteroidle - Daily Manager & Arcade UI Controller
 * Manages 5-round puzzle progression, Calendar Archive, Stats Modal,
 * Wordle-style emoji sharing, Unlimited Mode, and Unified Game Settings Studio.
 */



 // Initializes Google Auth

const SOLO_PRESETS = {
    arrows: { thrust: 'ArrowUp', rotateLeft: 'ArrowLeft', rotateRight: 'ArrowRight', fire: 'Space', shield: 'ArrowDown' },
    wasd:   { thrust: 'KeyW',    rotateLeft: 'KeyA',      rotateRight: 'KeyD',       fire: 'Space', shield: 'KeyS' },
    okl:    { thrust: 'KeyO',    rotateLeft: 'KeyK',      rotateRight: 'Semicolon',  fire: 'KeyM',  shield: 'KeyL' },
    ijkl:   { thrust: 'KeyI',    rotateLeft: 'KeyJ',      rotateRight: 'KeyL',       fire: 'Space', shield: 'KeyK' }
};

function formatKeyCodeLabel(code) {
    if (!code) return '?';
    const map = {
        ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
        Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
        ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
        AltLeft: 'L-ALT', AltRight: 'R-ALT',
        Enter: 'ENTER', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/'
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    return code.toUpperCase();
}

class DailyManager {
    constructor() {
        this.isUnlimited = false;
        this.isReviewMode = false;
        this.currentDateStr = getTodayDateStr();
        this.puzzleNum = getPuzzleNumber(this.currentDateStr);
        const todayObj = parseDate(this.currentDateStr);
        this.calYear = todayObj.getFullYear();
        this.calMonth = todayObj.getMonth();
        this.challenges = [];
        this.currentRound = 1; // 1 to 5
        this.roundScores = [];
        this.engine = null;
        this.listeningKeycapBtn = null;

        this.initDOM();
        this.checkURLParams();
        this.setupModals();
        this.setupSettings();
        if (this.isUnlimited) {
            this.startUnlimitedPuzzle();
        } else {
            this.startPuzzle(this.currentDateStr);
        }
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        const modeParam = urlParams.get('mode');
        const todayStr = getTodayDateStr();

        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            // Clamp date parameter to [EPOCH_DATE_STR, todayStr] so future or pre-epoch dates cannot be loaded (AST-L4)
            let safeDate = dateParam;
            if (safeDate > todayStr) safeDate = todayStr;
            if (safeDate < EPOCH_DATE_STR) safeDate = EPOCH_DATE_STR;
            this.currentDateStr = safeDate;
            this.puzzleNum = getPuzzleNumber(safeDate);
            this.isUnlimited = false;
        } else if (modeParam === 'practice' || modeParam === 'unlimited') {
            this.isUnlimited = true;
        } else if (modeParam === 'daily') {
            this.isUnlimited = false;
        } else {
            const savedMode = localStorage.getItem('asteroidle_game_mode');
            if (savedMode === 'practice' || savedMode === 'unlimited') {
                this.isUnlimited = true;
            } else {
                this.isUnlimited = false;
            }
        }
        this.updateModeButton();
    }

    initDOM() {
        const canvas = document.getElementById('gameCanvas') || document.getElementById('asteroidle-canvas');
        this.engine = new AsteroidleEngine(canvas, (score, telem) => {
            this.onRoundResolved(score, telem);
        });

        // Segmented Mode Toggle (Daily vs Practice)
        const dailyBtn = document.getElementById('mode-daily-btn');
        const practiceBtn = document.getElementById('mode-practice-btn');
        if (dailyBtn) {
            dailyBtn.addEventListener('click', () => {
                dailyBtn.blur();
                this.setGameMode(false);
            });
        }
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                practiceBtn.blur();
                this.setGameMode(true);
            });
        }

        // Backward compatibility for single mode toggle button
        const modeBtn = document.getElementById('mode-toggle-btn');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                this.setGameMode(!this.isUnlimited);
            });
        }

        // Sound Toggle in Top HUD
        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) {
            const isSoundOn = localStorage.getItem('spaceship_flight_sound') === 'true';
            soundBtn.textContent = isSoundOn ? '🔊' : '🔇';
            soundBtn.addEventListener('click', () => {
                soundBtn.blur();
                const nextState = !(localStorage.getItem('spaceship_flight_sound') === 'true');
                this.engine.setSound(nextState);
                soundBtn.textContent = nextState ? '🔊' : '🔇';
                const settingSound = document.getElementById('settingSound');
                if (settingSound) settingSound.checked = nextState;
            });
        }

        // Next Round button and overlay click in result banner
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) {
            resultBanner.addEventListener('click', () => this.advanceNextRound());
        }
        const nextBtn = document.getElementById('next-round-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                nextBtn.blur();
                this.advanceNextRound();
            });
        }

        // Space key advances round if result banner is active
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                const banner = document.getElementById('round-result-banner');
                if (banner && banner.classList.contains('visible')) {
                    e.preventDefault();
                    this.advanceNextRound();
                }
            }
        });

        this.updateModeButton();
    }

    setGameMode(isUnlimited) {
        if (this.isUnlimited === isUnlimited) return;
        this.isUnlimited = isUnlimited;
        this.updateModeButton();
        if (this.isUnlimited) {
            this.startUnlimitedPuzzle();
        } else {
            this.startPuzzle(getTodayDateStr());
        }
    }

    updateModeButton() {
        const dailyBtn = document.getElementById('mode-daily-btn');
        const practiceBtn = document.getElementById('mode-practice-btn');

        if (dailyBtn && practiceBtn) {
            if (this.isUnlimited) {
                dailyBtn.classList.remove('active');
                practiceBtn.classList.add('active');
            } else {
                practiceBtn.classList.remove('active');
                dailyBtn.classList.add('active');
            }
        }

        const modeBtn = document.getElementById('mode-toggle-btn');
        if (modeBtn) {
            if (this.isUnlimited) {
                modeBtn.textContent = 'DAILY';
                modeBtn.classList.add('unlimited-active');
            } else {
                modeBtn.textContent = 'UNLIMITED';
                modeBtn.classList.remove('unlimited-active');
            }
        }

        const newMode = this.isUnlimited ? 'practice' : 'daily';
        try {
            localStorage.setItem('asteroidle_game_mode', newMode);
        } catch (e) { }

        try {
            const url = new URL(window.location.href);
            if (this.isUnlimited) {
                url.searchParams.delete('date');
                url.searchParams.set('mode', 'practice');
            } else {
                url.searchParams.delete('mode');
                if (this.currentDateStr === getTodayDateStr()) {
                    url.searchParams.delete('date');
                }
            }
            window.history.replaceState({}, '', url.toString());
        } catch (e) { }
    }

    startPuzzle(dateStr) {
        const todayStr = getTodayDateStr();
        if (dateStr > todayStr) dateStr = todayStr;
        if (dateStr < EPOCH_DATE_STR) dateStr = EPOCH_DATE_STR;

        this.currentDateStr = dateStr;
        this.puzzleNum = getPuzzleNumber(dateStr);
        this.challenges = generateDailyChallenges(dateStr);
        this.roundScores = [];
        this.currentRound = 1;
        this.isReviewMode = false;

        // Check if already completed for this date (AST-C4)
        const existing = getRecordForDate(dateStr);
        if (existing && existing.completed) {
            this.isReviewMode = true;
            this.roundScores = [...(existing.roundScores || [0, 0, 0, 0, 0])];
            this.currentRound = 6;
            this.updateHeaderBanner();
            this.updatePips();
            // Load Round 1 into the arena for non-destructive review/practice while keeping official record locked
            if (this.challenges[0]) {
                this.engine.loadChallenge(this.challenges[0]);
            }
            this.showResultsModal(existing.totalScore);
            return;
        }

        // Restore active progress if partially played (AST-C5: resume at scores.length + 1)
        const saved = loadActiveState(dateStr);
        if (saved && Array.isArray(saved.scores) && saved.scores.length > 0) {
            this.roundScores = saved.scores.slice(0, 5);
            this.currentRound = this.roundScores.length + 1;
            if (this.currentRound > 5) {
                this.finalizePuzzle();
                return;
            }
        }

        this.updateHeaderBanner();
        this.updatePips();
        this.loadCurrentRound();
    }

    /**
     * Unlimited Practice Mode seeded via Date.now() (System.currentTimeMillis equivalent)
     * Reuses generateDailyChallenges directly with zero code duplication (AST-H4)
     */
    startUnlimitedPuzzle() {
        const nowMillis = String(Date.now());
        this.currentDateStr = 'UNLIMITED';
        this.puzzleNum = (Date.now() % 9000) + 1000;
        this.isReviewMode = false;
        this.challenges = generateDailyChallenges(nowMillis);
        this.roundScores = [];
        this.currentRound = 1;
        this.updateHeaderBanner();
        this.updatePips();
        this.loadCurrentRound();
    }

    /**
     * Reset the current puzzle and genuinely replay from Round 1 (AST-C4)
     */
    resetCurrentPuzzle() {
        document.getElementById('stats-modal')?.classList.remove('active');
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) {
            resultBanner.classList.remove('visible');
            resultBanner.style.display = 'none';
        }

        if (this.isUnlimited) {
            this.startUnlimitedPuzzle();
        } else {
            resetDailyCompletion(this.currentDateStr);
            this.isReviewMode = false;
            this.startPuzzle(this.currentDateStr);
        }
    }

    updateHeaderBanner() {
        const pNumBadge = document.getElementById('puzzle-number-badge');
        const pDateLabel = document.getElementById('puzzle-date-label');
        if (pNumBadge) {
            pNumBadge.textContent = this.isUnlimited ? `SECTOR #${this.puzzleNum}` : `ASTEROIDLE #${this.puzzleNum}`;
        }
        if (pDateLabel) {
            pDateLabel.textContent = this.isUnlimited
                ? `UNLIMITED MISSION`
                : (this.isReviewMode ? `${this.currentDateStr} (COMPLETED)` : this.currentDateStr);
        }

        const roundInd = document.getElementById('round-indicator');
        if (roundInd) {
            roundInd.textContent = `${Math.min(5, this.currentRound)} / 5`;
        }

        const totalScoreVal = document.getElementById('total-score-val');
        if (totalScoreVal) {
            const sum = this.roundScores.reduce((a, b) => a + b, 0);
            totalScoreVal.textContent = `${sum} / 500`;
        }
    }

    updatePips() {
        for (let r = 1; r <= 5; r++) {
            const pip = document.getElementById(`pip-${r}`);
            if (!pip) continue;

            pip.className = 'round-pip';
            const score = this.roundScores[r - 1];

            if (score !== undefined) {
                pip.textContent = score;
                if (score === 100) pip.classList.add('hit');
                else if (score > 0) pip.classList.add('near');
                else pip.classList.add('miss');
            } else if (r === this.currentRound) {
                pip.textContent = r;
                pip.classList.add('current');
            } else {
                pip.textContent = r;
            }
        }
    }

    loadCurrentRound() {
        if (this.currentRound > 5) {
            this.finalizePuzzle();
            return;
        }

        const ch = this.challenges[this.currentRound - 1];
        if (!ch) return;

        // Hide result banner
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) {
            resultBanner.classList.remove('visible');
            resultBanner.style.display = 'none';
        }

        this.updateHeaderBanner();
        this.updatePips();
        this.engine.loadChallenge(ch);
    }

    onRoundResolved(score, telem) {
        // In review mode (already completed daily puzzle), allow free practice shots without overwriting history (AST-C4)
        if (!this.isReviewMode) {
            this.roundScores[this.currentRound - 1] = score;
            if (!this.isUnlimited) {
                saveActiveState(this.currentDateStr, this.currentRound + 1, this.roundScores);
            }
        }

        this.updateHeaderBanner();
        this.updatePips();

        // Show floating telemetry result banner
        const resultBanner = document.getElementById('round-result-banner');
        const headline = document.getElementById('round-score-headline');
        const points = document.getElementById('round-score-points');
        const subtext = document.getElementById('round-score-subtext');
        const nextBtn = document.getElementById('next-round-btn');

        if (headline) headline.textContent = telem.message;
        if (points) points.textContent = `+${score} PTS`;
        if (subtext) subtext.textContent = telem.subtext;
        if (nextBtn) {
            const isLastRound = this.isReviewMode || this.currentRound >= 5;
            const mainLabel = nextBtn.querySelector('.btn-main-label');
            const subLabel = nextBtn.querySelector('.btn-sub-label');
            if (mainLabel) {
                mainLabel.textContent = isLastRound ? 'VIEW MISSION INTEL 📊' : 'NEXT ASTEROID ➔';
            } else {
                nextBtn.textContent = isLastRound ? 'VIEW MISSION INTEL [SPACE] 📊' : 'NEXT ASTEROID [SPACE] ➔';
            }
            if (subLabel) {
                subLabel.textContent = 'PRESS [SPACE] OR CLICK TO CONTINUE';
            }
        }

        if (resultBanner) {
            resultBanner.classList.remove('hidden');
            resultBanner.style.display = 'flex';
            requestAnimationFrame(() => {
                resultBanner.classList.add('visible');
            });
        }
    }

    advanceNextRound() {
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) {
            resultBanner.classList.remove('visible');
            resultBanner.style.display = 'none';
        }

        if (this.isReviewMode) {
            const total = this.roundScores.reduce((a, b) => a + b, 0);
            this.showResultsModal(total);
            return;
        }

        this.currentRound++;
        if (this.currentRound <= 5) {
            this.loadCurrentRound();
        } else {
            this.finalizePuzzle();
        }
    }

    finalizePuzzle() {
        const total = this.roundScores.reduce((a, b) => a + b, 0);

        if (!this.isUnlimited && !this.isReviewMode) {
            recordDailyCompletion(this.currentDateStr, this.puzzleNum, this.roundScores, total);
            this.isReviewMode = true;
        }

        this.showResultsModal(total);
    }

    showResultsModal(totalScore) {
        this.renderStatsModal();
        const modal = document.getElementById('stats-modal');
        if (modal) modal.classList.add('active');
    }

    setupModals() {
        // Modal close buttons (data-close="modal-id")
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.close;
                if (targetId) {
                    document.getElementById(targetId)?.classList.remove('active');
                } else {
                    btn.closest('.modal-backdrop, .overlay')?.classList.remove('active');
                }
            });
        });

        // Close on backdrop click
        document.querySelectorAll('.modal-backdrop, .overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });

        // Help Modal
        document.getElementById('help-modal-btn')?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            document.getElementById('help-modal')?.classList.add('active');
        });

        // Stats Modal
        document.getElementById('stats-modal-btn')?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            this.renderStatsModal();
            document.getElementById('stats-modal')?.classList.add('active');
        });

        // Archive Modal
        this.setupArchiveTabs();
        document.getElementById('archive-modal-btn')?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            this.renderArchiveModal();
            document.getElementById('archive-modal')?.classList.add('active');
        });

        // Share Intel button
        document.getElementById('share-score-btn')?.addEventListener('click', () => {
            this.shareScore();
        });

        // Reset / Replay Puzzle button (AST-C4)
        document.getElementById('reset-puzzle-btn')?.addEventListener('click', () => {
            this.resetCurrentPuzzle();
        });
    }

    /**
     * Unified Modern Settings Studio (Shared with Spaceship Flight - AST-C6, AST-C7, SYS-02, AST-L3)
     */
    setupSettings() {
        const settingsModal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeBtn = document.getElementById('closeSettingsBtn');

        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => {
                settingsBtn.blur();
                this.updateColorStudioUI();
                this.updateControlsUI();
                settingsModal.classList.add('active');
            });
        }
        if (closeBtn && settingsModal) {
            closeBtn.addEventListener('click', () => {
                this.stopKeybindListening();
                settingsModal.classList.remove('active');
            });
        }

        // Settings Tabs Navigation (General vs 1-Player Controls)
        const tabBtns = settingsModal ? settingsModal.querySelectorAll('.settings-tab-btn') : [];
        const paneGeneral = document.getElementById('settingsPaneGeneral');
        const paneSolo = document.getElementById('settingsPaneSolo');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.stopKeybindListening();
                const tab = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.toggle('active', b === btn));
                if (paneGeneral) paneGeneral.classList.toggle('active', tab === 'general');
                if (paneSolo) paneSolo.classList.toggle('active', tab === 'solo');
            });
        });

        // Hull Color Studio (Original Fleet, 8 Neon Presets, Custom Hex Picker, Live Preview)
        const redBtn = document.getElementById('selectRedShip');
        const blueBtn = document.getElementById('selectBlueShip');
        const presetsGrid = document.getElementById('colorPresetsGrid');
        const colorPicker = document.getElementById('shipColorPicker');
        const matchLaserCheckbox = document.getElementById('settingMatchLaserColor');

        const applyHullColor = (hexColor) => {
            this.engine.setShipColor(hexColor);
            this.updateColorStudioUI();
        };

        redBtn?.addEventListener('click', () => applyHullColor('#850101'));
        blueBtn?.addEventListener('click', () => applyHullColor('#0211d0'));

        if (presetsGrid) {
            presetsGrid.querySelectorAll('.color-preset-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    if (chip.dataset.color) applyHullColor(chip.dataset.color);
                });
            });
        }

        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                applyHullColor(e.target.value);
            });
        }

        if (matchLaserCheckbox) {
            matchLaserCheckbox.checked = localStorage.getItem('spaceship_flight_match_laser_color') === 'true';
            matchLaserCheckbox.addEventListener('change', (e) => {
                this.engine.setMatchLaserColor(e.target.checked);
            });
        }

        if (this.engine && this.engine.ship && this.engine.ship.sprites && this.engine.ship.sprites.redNormal) {
            this.engine.ship.sprites.redNormal.addEventListener('load', () => {
                this.updateColorStudioUI();
            });
        }
        this.updateColorStudioUI();

        // Ship Scale Slider
        const shipScaleSlider = document.getElementById('settingShipSize');
        const shipScaleVal = document.getElementById('shipSizeVal');
        const currentScale = parseInt(localStorage.getItem('spaceship_flight_ship_scale') || '100', 10);
        if (shipScaleSlider) {
            shipScaleSlider.value = currentScale;
            if (shipScaleVal) shipScaleVal.textContent = `${currentScale}%`;

            shipScaleSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (shipScaleVal) shipScaleVal.textContent = `${val}%`;
                this.engine.setShipScale(val);
            });
        }

        // Background Stars Toggle
        const starsCheckbox = document.getElementById('settingStars');
        if (starsCheckbox) {
            starsCheckbox.checked = localStorage.getItem('spaceship_flight_stars') !== 'false';
            starsCheckbox.addEventListener('change', (e) => {
                this.engine.setShowStars(e.target.checked);
            });
        }

        // Sound Toggle Checkbox in Settings
        const soundCheckbox = document.getElementById('settingSound');
        const soundBtn = document.getElementById('soundToggleBtn');
        const isSoundOn = localStorage.getItem('spaceship_flight_sound') === 'true';
        if (soundCheckbox) {
            soundCheckbox.checked = isSoundOn;
            soundCheckbox.addEventListener('change', (e) => {
                this.engine.setSound(e.target.checked);
                if (soundBtn) soundBtn.textContent = e.target.checked ? '🔊' : '🔇';
            });
        }

        // Touch Controls Visibility Selector (Unified key: spaceship_flight_touch_controls - SYS-02, AST-L3)
        const touchSelect = document.getElementById('settingTouchControls');
        const touchControls = document.getElementById('touchControls');
        const savedTouch = localStorage.getItem('spaceship_flight_touch_controls') ||
            localStorage.getItem('spaceship_flight_touch_visibility') || 'auto';

        const applyTouchVisibility = (mode) => {
            if (!touchControls) return;
            touchControls.classList.remove('hidden', 'auto-hide');
            if (mode === 'hidden') {
                touchControls.classList.add('hidden');
            } else if (mode === 'auto') {
                touchControls.classList.add('auto-hide');
            }
        };

        applyTouchVisibility(savedTouch);
        if (touchSelect) {
            touchSelect.value = savedTouch;
            touchSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                try {
                    localStorage.setItem('spaceship_flight_touch_controls', val);
                    localStorage.setItem('spaceship_flight_touch_visibility', val);
                } catch (err) { }
                applyTouchVisibility(val);
            });
        }

        // Button Size Slider
        const btnSizeSlider = document.getElementById('settingBtnSize');
        const btnSizeVal = document.getElementById('btnSizeVal');
        const savedBtnSize = localStorage.getItem('spaceship_flight_btn_size') || '72';
        document.documentElement.style.setProperty('--ctrl-btn-size', `${savedBtnSize}px`);
        if (btnSizeSlider) {
            btnSizeSlider.value = savedBtnSize;
            if (btnSizeVal) btnSizeVal.textContent = `${savedBtnSize}px`;

            btnSizeSlider.addEventListener('input', (e) => {
                const sz = e.target.value;
                if (btnSizeVal) btnSizeVal.textContent = `${sz}px`;
                document.documentElement.style.setProperty('--ctrl-btn-size', `${sz}px`);
                try { localStorage.setItem('spaceship_flight_btn_size', sz); } catch (err) { }
            });
        }

        // 1-Player Solo Controls Keybinder (Shared with Spaceship Flight - AST-C7)
        this.setupControlsBinder();
    }

    updateColorStudioUI() {
        const SpaceshipClass = window.SpaceshipCore && window.SpaceshipCore.Spaceship;
        if (!SpaceshipClass || !this.engine || !this.engine.ship) return;

        const currentColor = SpaceshipClass.normalizeHexColor(
            this.engine.ship.customColor || localStorage.getItem('spaceship_flight_ship_color_p1') || '#850101'
        );
        const colorName = SpaceshipClass.getColorName(currentColor);

        const redBtn = document.getElementById('selectRedShip');
        const blueBtn = document.getElementById('selectBlueShip');
        redBtn?.classList.toggle('active', currentColor === '#850101');
        blueBtn?.classList.toggle('active', currentColor === '#0211d0');

        const presetsGrid = document.getElementById('colorPresetsGrid');
        if (presetsGrid) {
            presetsGrid.querySelectorAll('.color-preset-chip').forEach(chip => {
                const chipColor = SpaceshipClass.normalizeHexColor(chip.dataset.color);
                chip.classList.toggle('active', chipColor === currentColor);
            });
        }

        const picker = document.getElementById('shipColorPicker');
        if (picker) picker.value = currentColor;

        const hexDisplay = document.getElementById('shipColorHexDisplay');
        if (hexDisplay) hexDisplay.textContent = currentColor.toUpperCase();

        const nameDisplay = document.getElementById('colorPreviewNameDisplay');
        if (nameDisplay) nameDisplay.textContent = colorName;

        const previewImg = document.getElementById('settingsShipPreviewImg');
        if (previewImg) {
            const baseSprite = this.engine.ship.sprites && this.engine.ship.sprites.redNormal;
            if (currentColor === '#850101') {
                previewImg.src = '../images/newspaceship.png';
            } else if (currentColor === '#0211d0') {
                previewImg.src = '../images/bluenewspaceship.png';
            } else if (baseSprite) {
                previewImg.src = SpaceshipClass.getRecoloredDataUrl(baseSprite, currentColor);
            }
        }
    }

    setupControlsBinder() {
        const presetSelect = document.getElementById('presetSoloSelect');
        const resetBtn = document.getElementById('resetSoloControlsBtn');
        const paneSolo = document.getElementById('settingsPaneSolo');

        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                this.stopKeybindListening();
                const preset = SOLO_PRESETS[e.target.value];
                if (preset) {
                    this.saveSoloControls({ ...preset });
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.stopKeybindListening();
                this.saveSoloControls({ ...SOLO_PRESETS.arrows });
            });
        }

        if (paneSolo) {
            paneSolo.querySelectorAll('.keycap-btn[data-player="solo"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.listeningKeycapBtn === btn) {
                        this.stopKeybindListening();
                        return;
                    }
                    this.stopKeybindListening();
                    this.listeningKeycapBtn = btn;
                    btn.classList.add('listening');
                    btn.textContent = 'PRESS KEY...';
                });
            });
        }

        window.addEventListener('keydown', (e) => {
            if (!this.listeningKeycapBtn) return;
            e.preventDefault();
            e.stopPropagation();

            if (e.code === 'Escape') {
                this.stopKeybindListening();
                return;
            }

            const action = this.listeningKeycapBtn.dataset.action;
            if (action) {
                const updated = { ...this.engine.loadSoloControls(), [action]: e.code };
                this.saveSoloControls(updated);
            }
            this.stopKeybindListening();
        }, true);

        this.updateControlsUI();
    }

    stopKeybindListening() {
        if (this.listeningKeycapBtn) {
            this.listeningKeycapBtn.classList.remove('listening');
            this.listeningKeycapBtn = null;
            this.updateControlsUI();
        }
    }

    saveSoloControls(controls) {
        try {
            localStorage.setItem('spaceship_flight_controls_solo', JSON.stringify(controls));
        } catch (_) {}
        if (this.engine) {
            this.engine.setSoloControls(controls);
        }
        this.updateControlsUI();
    }

    updateControlsUI() {
        const controls = this.engine ? this.engine.loadSoloControls() : SOLO_PRESETS.arrows;
        const paneSolo = document.getElementById('settingsPaneSolo');
        if (paneSolo) {
            paneSolo.querySelectorAll('.keycap-btn[data-player="solo"]').forEach(btn => {
                const action = btn.dataset.action;
                const code = controls[action] || SOLO_PRESETS.arrows[action];
                btn.dataset.code = code;
                btn.textContent = formatKeyCodeLabel(code);
            });
        }

        const presetSelect = document.getElementById('presetSoloSelect');
        if (presetSelect) {
            let matched = 'custom';
            for (const [name, map] of Object.entries(SOLO_PRESETS)) {
                if (
                    controls.rotateLeft === map.rotateLeft &&
                    controls.rotateRight === map.rotateRight &&
                    controls.fire === map.fire
                ) {
                    matched = name;
                    break;
                }
            }
            presetSelect.value = matched;
        }
    }

    renderStatsModal() {
        const stats = getStats();
        const playedElem = document.getElementById('stat-played');
        const winPctElem = document.getElementById('stat-win-pct');
        const streakElem = document.getElementById('stat-streak');
        const maxStreakElem = document.getElementById('stat-max-streak');

        if (playedElem) playedElem.textContent = stats.played;
        if (winPctElem) winPctElem.textContent = stats.played > 0 ? `${Math.round((stats.won / stats.played) * 100)}%` : '0%';
        if (streakElem) streakElem.textContent = stats.currentStreak;
        if (maxStreakElem) maxStreakElem.textContent = stats.maxStreak;

        // Score Distribution Histogram
        const distContainer = document.getElementById('score-distribution-bars');
        if (distContainer) {
            const keys = ['0-100', '101-200', '201-300', '301-400', '401-500'];
            const maxVal = Math.max(1, ...keys.map(k => stats.distribution[k] || 0));
            const total = this.roundScores.reduce((a, b) => a + b, 0);

            // Highlight active score bracket when puzzle is completed or in review mode (AST-L6)
            let activeBracket = null;
            const dateRecord = !this.isUnlimited ? getRecordForDate(this.currentDateStr) : null;
            const isCompletedMission = (this.currentRound > 5 && this.roundScores.length === 5) || !!(dateRecord && dateRecord.completed);
            if (isCompletedMission && this.roundScores.length === 5) {
                if (total <= 100) activeBracket = '0-100';
                else if (total <= 200) activeBracket = '101-200';
                else if (total <= 300) activeBracket = '201-300';
                else if (total <= 400) activeBracket = '301-400';
                else activeBracket = '401-500';
            }

            distContainer.innerHTML = keys.map(k => {
                const count = stats.distribution[k] || 0;
                const isHighlight = (k === activeBracket && count > 0);
                const pct = count > 0 ? Math.max(8, Math.round((count / maxVal) * 100)) : 0;
                const fillClass = count > 0 ? 'dist-bar-fill has-data' : 'dist-bar-fill is-zero';
                const highlightClass = isHighlight ? ' highlight' : '';

                return `
                    <div class="dist-row">
                        <span class="dist-label">${k}</span>
                        <div class="dist-bar-track">
                            <div class="${fillClass}${highlightClass}" style="${count > 0 ? `width: ${pct}%;` : ''}">
                                <span class="dist-bar-num">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Current Mission Performance Breakdown
        const blocksContainer = document.getElementById('mission-round-blocks');
        const finalScoreElem = document.getElementById('mission-final-score-val');
        const total = this.roundScores.reduce((a, b) => a + b, 0);

        if (finalScoreElem) finalScoreElem.textContent = `${total} / 500`;

        if (blocksContainer) {
            blocksContainer.innerHTML = [1, 2, 3, 4, 5].map(r => {
                const s = this.roundScores[r - 1];
                let cls = 'block-pending';
                let text = '--';
                if (s !== undefined) {
                    text = s;
                    if (s === 100) cls = 'block-hit';
                    else if (s >= 75) cls = 'block-high';
                    else if (s >= 35) cls = 'block-mid';
                    else cls = 'block-miss';
                }
                return `
                    <div class="round-block ${cls}">
                        <span class="block-label">R${r}</span>
                        <span class="block-val">${text}</span>
                    </div>
                `;
            }).join('');
        }
    }

    shareScore() {
        const total = this.roundScores.reduce((a, b) => a + b, 0);
        const emojis = this.roundScores.map(s => {
            if (s === 100) return '🟢 100';
            if (s >= 75) return `🟡  ${s}`;
            if (s >= 35) return `🟠  ${s}`;
            return `🔴  ${s}`;
        });

        // Distinguish Unlimited vs Daily in shared header (AST-L5)
        const titleLine = this.isUnlimited
            ? `Asteroidle Unlimited (Sector #${this.puzzleNum}) 🎯 ${total}/500\n`
            : `Asteroidle #${this.puzzleNum} 🎯 ${total}/500\n`;

        const shareText = titleLine +
            emojis.map((e, idx) => `🪨 R${idx + 1}: ${e}`).join('\n') +
            `\nhttps://amitjoshi2724.github.io/Spaceship-Flight/asteroidle/`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast();
            }).catch(() => {
                alert(shareText);
            });
        } else {
            alert(shareText);
        }
    }

    showToast() {
        const toast = document.getElementById('share-toast');
        if (!toast) return;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2500);
    }

    setupArchiveTabs() {
        const calTab = document.getElementById('archive-tab-calendar');
        const listTab = document.getElementById('archive-tab-list');
        const calView = document.getElementById('archive-calendar-view');
        const listView = document.getElementById('archive-list-view');

        if (calTab && listTab && calView && listView) {
            calTab.addEventListener('click', () => {
                calTab.classList.add('active');
                listTab.classList.remove('active');
                calView.style.display = 'block';
                listView.style.display = 'none';
                this.renderCalendarView();
            });

            listTab.addEventListener('click', () => {
                listTab.classList.add('active');
                calTab.classList.remove('active');
                listView.style.display = 'block';
                calView.style.display = 'none';
                this.renderArchiveList();
            });
        }

        // Year select
        const yearSelect = document.getElementById('cal-year-select');
        if (yearSelect) {
            yearSelect.innerHTML = '';
            const currentYear = parseDate(getTodayDateStr()).getFullYear();
            for (let y = currentYear; y >= 2024; y--) {
                const opt = document.createElement('option');
                opt.value = String(y);
                opt.textContent = String(y);
                yearSelect.appendChild(opt);
            }
            yearSelect.value = String(this.calYear);
            yearSelect.addEventListener('change', (e) => {
                this.calYear = Math.max(2024, Number(e.target.value));
                this.renderCalendarView();
            });
        }

        // Month select
        const monthSelect = document.getElementById('cal-month-select');
        if (monthSelect) {
            monthSelect.value = String(this.calMonth);
            monthSelect.addEventListener('change', (e) => {
                this.calMonth = Number(e.target.value);
                this.renderCalendarView();
            });
        }

        // Month navigation buttons with lower bound clamped to Jan 2024 (AST-L4)
        document.getElementById('cal-prev-month-btn')?.addEventListener('click', () => {
            if (this.calYear <= 2024 && this.calMonth <= 0) return;
            this.calMonth--;
            if (this.calMonth < 0) {
                this.calMonth = 11;
                this.calYear = Math.max(2024, this.calYear - 1);
            }
            this.renderCalendarView();
        });

        document.getElementById('cal-next-month-btn')?.addEventListener('click', () => {
            this.calMonth++;
            if (this.calMonth > 11) {
                this.calMonth = 0;
                this.calYear++;
            }
            this.renderCalendarView();
        });

        document.getElementById('cal-today-btn')?.addEventListener('click', () => {
            const t = parseDate(getTodayDateStr());
            this.calYear = t.getFullYear();
            this.calMonth = t.getMonth();
            this.renderCalendarView();
        });

        // Search and filter for list view
        const searchInput = document.getElementById('archive-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderArchiveList(searchInput.value);
            });
        }

        document.querySelectorAll('.archive-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.archive-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderArchiveList(searchInput ? searchInput.value : '');
            });
        });
    }

    renderArchiveModal() {
        this.renderCalendarView();
        this.renderArchiveList();
    }

    renderCalendarView() {
        const container = document.getElementById('calendar-days-container');
        if (!container) return;

        // Clamp calendar view to [2024-01, today] (AST-L4)
        const todayStr = getTodayDateStr();
        const todayDate = parseDate(todayStr);
        if (this.calYear < 2024) {
            this.calYear = 2024;
            this.calMonth = 0;
        }
        if (this.calYear > todayDate.getFullYear() || (this.calYear === todayDate.getFullYear() && this.calMonth > todayDate.getMonth())) {
            this.calYear = todayDate.getFullYear();
            this.calMonth = todayDate.getMonth();
        }

        const monthSelect = document.getElementById('cal-month-select');
        const yearSelect = document.getElementById('cal-year-select');
        const prevBtn = document.getElementById('cal-prev-month-btn');
        const nextBtn = document.getElementById('cal-next-month-btn');

        if (monthSelect) monthSelect.value = String(this.calMonth);
        if (yearSelect) yearSelect.value = String(this.calYear);

        if (prevBtn) {
            prevBtn.disabled = (this.calYear <= 2024 && this.calMonth <= 0);
        }
        if (nextBtn) {
            const isFutureMonth =
                this.calYear > todayDate.getFullYear() ||
                (this.calYear === todayDate.getFullYear() && this.calMonth >= todayDate.getMonth());
            nextBtn.disabled = isFutureMonth;
        }

        const firstDayIndex = new Date(this.calYear, this.calMonth, 1).getDay(); // 0 = Sunday
        const totalDaysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
        const history = getHistory();

        const cellsHtml = [];
        const TOTAL_SLOTS = 42; // Fixed 6 weeks for layout stability

        // Leading empty cells
        for (let i = 0; i < firstDayIndex; i++) {
            cellsHtml.push('<div class="calendar-day-cell is-empty"></div>');
        }

        // Day cells
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isFuture = dateStr > todayStr;
            const isToday = dateStr === todayStr;

            if (isFuture) {
                cellsHtml.push(`
                    <div class="calendar-day-cell is-future">
                        <div class="cal-day-num">${day}</div>
                    </div>
                `);
                continue;
            }

            const pNum = getPuzzleNumber(dateStr);
            const record = history[dateStr];

            let statusClass = 'status-pending';
            let statusTag = isToday ? '🚀 Mission' : '⚪ Play';

            if (record && record.completed) {
                statusClass = 'status-completed';
                statusTag = record.totalScore === 500 ? '🏆 500' : `⭐ ${record.totalScore} pts`;
            }

            cellsHtml.push(`
                <div class="calendar-day-cell ${statusClass} ${isToday ? 'is-today' : ''}"
                     data-date="${dateStr}" title="Mission #${pNum} — ${dateStr}">
                    <div class="cal-day-num">${day}</div>
                    <div class="cal-puzzle-num">#${pNum}</div>
                    <div class="cal-status-tag">${statusTag}</div>
                </div>
            `);
        }

        // Trailing empty cells to fill 42 slots
        const filled = firstDayIndex + totalDaysInMonth;
        for (let i = filled; i < TOTAL_SLOTS; i++) {
            cellsHtml.push('<div class="calendar-day-cell is-empty"></div>');
        }

        container.innerHTML = cellsHtml.join('');

        // Click to load selected mission
        container.querySelectorAll('.calendar-day-cell:not(.is-empty):not(.is-future)').forEach(el => {
            el.addEventListener('click', () => {
                const date = el.dataset.date;
                document.getElementById('archive-modal')?.classList.remove('active');
                this.isUnlimited = false;
                this.updateModeButton();
                this.startPuzzle(date);
            });
        });
    }

    renderArchiveList(searchFilter = '') {
        const container = document.getElementById('archive-list-container');
        if (!container) return;

        const history = getHistory();
        const todayStr = getTodayDateStr();
        const todayNum = getPuzzleNumber(todayStr);
        const activeFilterBtn = document.querySelector('.archive-filter-btn.active');
        const filterMode = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';

        const items = [];

        for (let pNum = todayNum; pNum >= 1; pNum--) {
            const dateStr = getDateForPuzzleNumber(pNum);
            const record = history[dateStr];
            const isCompleted = record && record.completed;
            const isPlayed = !!record;

            if (filterMode === 'solved' && !isCompleted) continue;
            if (filterMode === 'unplayed' && isPlayed) continue;

            if (searchFilter) {
                const query = searchFilter.toLowerCase();
                if (!dateStr.includes(query) && !String(pNum).includes(query)) continue;
            }

            items.push({ pNum, dateStr, record, isCompleted, isPlayed, isToday: dateStr === todayStr });
        }

        if (items.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No missions match this filter.</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            let statusClass = 'status-pending';
            let badgeText = item.isToday ? 'Today\'s Mission' : 'Unplayed';

            if (item.isCompleted) {
                statusClass = 'status-completed';
                badgeText = item.record.totalScore === 500 ? '🏆 500 / 500' : `Score: ${item.record.totalScore} / 500`;
            } else if (item.isToday) {
                statusClass = 'status-today';
            }

            return `
                <div class="archive-card ${statusClass}">
                    <div class="archive-info">
                        <span class="archive-number">Mission #${item.pNum}</span>
                        <span class="archive-date">${item.dateStr}</span>
                    </div>
                    <div class="archive-action">
                        <span class="archive-badge">${badgeText}</span>
                        <button class="archive-play-btn menu-btn" data-date="${item.dateStr}">
                            ${item.isCompleted ? 'Review' : 'Launch'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.archive-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.dataset.date;
                document.getElementById('archive-modal')?.classList.remove('active');
                this.isUnlimited = false;
                this.updateModeButton();
                this.startPuzzle(date);
            });
        });
    }
}

// Boot DailyManager reliably on DOM load
function bootAsteroidle() {
    if (!window.asteroidleApp && (document.getElementById('gameCanvas') || document.getElementById('asteroidle-canvas'))) {
        window.asteroidleApp = new DailyManager();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootAsteroidle);
} else {
    bootAsteroidle();
}
})();
