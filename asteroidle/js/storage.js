/**
 * Asteroidle - Dual-Layer Storage Module
 * Offline-first localStorage with real-time Firestore cloud synchronization.
 */
import { db } from './firebase-config.js';
import { onAuthChange, getCurrentUser } from './auth.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

let memoryStats = loadLocalStats();
let memoryHistory = loadLocalHistory();
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
    memoryStats = { ...stats };
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

    // Update stats
    const stats = { ...memoryStats };
    stats.played += 1;
    stats.totalScore += totalScore;
    if (totalScore > stats.highScore) {
        stats.highScore = totalScore;
    }
    if (totalScore >= 350) {
        stats.won += 1;
    }

    // Streaks
    const today = dateStr;
    if (!stats.lastPlayedDate) {
        stats.currentStreak = 1;
    } else {
        const prev = new Date(stats.lastPlayedDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            stats.currentStreak += 1;
        } else if (diffDays > 1) {
            stats.currentStreak = 1;
        }
    }
    stats.lastPlayedDate = today;
    if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
    }

    // Distribution
    if (totalScore <= 100) stats.distribution['0-100'] += 1;
    else if (totalScore <= 200) stats.distribution['101-200'] += 1;
    else if (totalScore <= 300) stats.distribution['201-300'] += 1;
    else if (totalScore <= 400) stats.distribution['301-400'] += 1;
    else stats.distribution['401-500'] += 1;

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
    return { ...memoryStats };
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
    if (!user) return;

    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            asteroidle_stats: memoryStats,
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

    if (!user) return;

    try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

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

            // Merge stats: highest totals & streaks
            const mergedStats = {
                ...DEFAULT_STATS,
                ...cloudStats,
                played: Math.max(memoryStats.played, cloudStats.played || 0),
                won: Math.max(memoryStats.won, cloudStats.won || 0),
                currentStreak: Math.max(memoryStats.currentStreak, cloudStats.currentStreak || 0),
                maxStreak: Math.max(memoryStats.maxStreak, cloudStats.maxStreak || 0),
                highScore: Math.max(memoryStats.highScore, cloudStats.highScore || 0),
                totalScore: Math.max(memoryStats.totalScore, cloudStats.totalScore || 0),
                distribution: {
                    '0-100': (memoryStats.distribution['0-100'] || 0) + (cloudStats.distribution?.['0-100'] || 0),
                    '101-200': (memoryStats.distribution['101-200'] || 0) + (cloudStats.distribution?.['101-200'] || 0),
                    '201-300': (memoryStats.distribution['201-300'] || 0) + (cloudStats.distribution?.['201-300'] || 0),
                    '301-400': (memoryStats.distribution['301-400'] || 0) + (cloudStats.distribution?.['301-400'] || 0),
                    '401-500': (memoryStats.distribution['401-500'] || 0) + (cloudStats.distribution?.['401-500'] || 0)
                }
            };

            memoryStats = mergedStats;
            memoryHistory = mergedHistory;

            localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
            localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
            notifyListeners();

            // Push merged back to cloud
            await syncToCloud();
        } else {
            // First time login for this user: seed cloud with current local stats
            await syncToCloud();
        }

        // Setup real-time listener for multi-tab or cross-device updates
        firestoreUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const updated = docSnap.data();
                if (updated.asteroidle_stats) memoryStats = { ...DEFAULT_STATS, ...updated.asteroidle_stats };
                if (updated.asteroidle_history) memoryHistory = { ...updated.asteroidle_history };
                localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
                localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
                notifyListeners();
            }
        });
    } catch (e) {
        console.warn("Error setting up Firestore storage sync:", e);
    }
});
