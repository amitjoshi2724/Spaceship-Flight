/**
 * Asteroidle - Deterministic PRNG & Date Arithmetic Module
 * Uses Mulberry32 algorithm seeded by date hash.
 */

// Epoch for Puzzle #1: Jan 1, 2024
export const EPOCH_DATE_STR = '2024-01-01';

/**
 * 32-bit integer string hash (MurmurHash-inspired)
 */
export function hashString(str) {
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
export function createMulberry32(seed) {
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
export function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD to Date object at local midnight
 */
export function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Get Puzzle Number from date string (1-indexed from epoch)
 */
export function getPuzzleNumber(dateStr, epochStr = EPOCH_DATE_STR) {
    const [y1, m1, d1] = dateStr.split('-').map(Number);
    const [y2, m2, d2] = epochStr.split('-').map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.max(1, Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Get date string for a given Puzzle Number
 */
export function getDateForPuzzleNumber(puzzleNum, epochStr = EPOCH_DATE_STR) {
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
export function getTodayDateStr() {
    return formatDate(new Date());
}

/**
 * Generate 5 deterministic asteroid challenge parameters for a given date
 */
export function generateDailyChallenges(dateStr) {
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

        // Relative speed factor [0.85, 1.4]
        const speed = 0.85 + rng() * 0.55;

        // Angular rotation speed [-0.035, +0.035]
        const rotSpeed = (rng() - 0.5) * 0.07;

        // Bullet speed tier: round 1 is Tier 2, round 2 is Tier 3, etc., or pseudo-random tier 1-5
        const tierPool = [2, 3, 4, 1, 5];
        const bulletTier = tierPool[(round - 1) % tierPool.length];

        // Normalized initial spawn side (0: Left, 1: Top, 2: Right, 3: Bottom)
        const side = Math.floor(rng() * 4);

        // Normalized spawn position along that side [0.15, 0.85]
        const sidePos = 0.15 + rng() * 0.7;

        // Target center position across screen [0.25, 0.75]
        const targetX = 0.25 + rng() * 0.5;
        const targetY = 0.25 + rng() * 0.5;

        // Ship normalized fixed coordinate [0.2, 0.8] (guaranteed well-spaced from spawn)
        const shipX = 0.2 + rng() * 0.6;
        const shipY = 0.2 + rng() * 0.6;

        challenges.push({
            round,
            shapeIndex,
            baseRadius,
            speed,
            rotSpeed,
            bulletTier,
            side,
            sidePos,
            targetX,
            targetY,
            shipX,
            shipY
        });
    }

    return challenges;
}
