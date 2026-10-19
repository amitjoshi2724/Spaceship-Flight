/**
 * Asteroidle - Dual-Layer Storage Module
 * Offline-first localStorage with optional real-time Firestore cloud synchronization.
 * Operates seamlessly on file:// protocol, offline, or with active network connection.
 */
import { initFirebase } from './firebase-config.js';
import { onAuthChange, getCurrentUser } from './auth.js';

let firestoreDb = null;
let firestoreFns = null;

// Initialize Firestore if running on http/https
(async () => {
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
 * Compute current and max streaks from sorted history ledger
 */
function computeStreaksFromHistory(history) {
    const dates = Object.keys(history || {}).sort();
    if (dates.length === 0) return { currentStreak: 0, maxStreak: 0 };

    let maxStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const d of dates) {
        if (!prevDate) {
            tempStreak = 1;
        } else {
            const p = new Date(prevDate + 'T00:00:00Z');
            const c = new Date(d + 'T00:00:00Z');
            const diffDays = Math.round((c - p) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                tempStreak++;
            } else if (diffDays > 1) {
                tempStreak = 1;
            }
        }
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        prevDate = d;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastDate = dates[dates.length - 1];
    const p = new Date(lastDate + 'T00:00:00Z');
    const t = new Date(todayStr + 'T00:00:00Z');
    const diffFromToday = Math.round((t - p) / (1000 * 60 * 60 * 24));
    const currentStreak = (diffFromToday <= 1) ? tempStreak : 0;

    return { currentStreak, maxStreak };
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
export function saveLocalStats(stats) {
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
export function recordDailyCompletion(dateStr, puzzleNum, roundScores, totalScore) {
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
 * Save in-progress round state (so reload preserves mid-puzzle progress)
 */
export function saveActiveState(dateStr, round, scores) {
    try {
        const payload = { dateStr, round, scores, timestamp: Date.now() };
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    } catch (e) { }
}

export function loadActiveState(dateStr) {
    try {
        const raw = localStorage.getItem(ACTIVE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.dateStr === dateStr) return data;
        }
    } catch (e) { }
    return null;
}

export function clearActiveState(dateStr) {
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

export function getStats() {
    return sanitizeStats(memoryStats, memoryHistory);
}

export function getHistory() {
    return { ...memoryHistory };
}

export function getRecordForDate(dateStr) {
    return memoryHistory[dateStr] || null;
}

export function onStorageChange(callback) {
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

    if (!user || !firestoreDb || !firestoreFns) return;

    try {
        const userRef = firestoreFns.doc(firestoreDb, 'users', user.uid);
        const snap = await firestoreFns.getDoc(userRef);

        if (snap.exists()) {
            const cloudData = snap.data();
            const cloudStats = cloudData.asteroidle_stats || {};
            const cloudHistory = cloudData.asteroidle_history || {};

            // Merge history: union of completed puzzles, keeping higher score if duplicate
            const mergedHistory = { ...memoryHistory };
            for (const [date, rec] of Object.entries(cloudHistory)) {
                if (!mergedHistory[date] || (rec.totalScore > mergedHistory[date].totalScore)) {
                    mergedHistory[date] = rec;
                }
            }

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
                if (updated.asteroidle_history) memoryHistory = { ...memoryHistory, ...updated.asteroidle_history };
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
