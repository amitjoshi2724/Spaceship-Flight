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
        let shipX, shipY;
        let attempts = 0;
        do {
            shipX = 0.18 + rng() * 0.64;
            shipY = 0.18 + rng() * 0.64;
            attempts++;
        } while (Math.hypot(shipX - startX, shipY - startY) < 0.32 && attempts < 20);

        if (Math.hypot(shipX - startX, shipY - startY) < 0.32) {
            shipX = startX > 0.5 ? startX - 0.35 : startX + 0.35;
            shipY = startY > 0.5 ? startY - 0.35 : startY + 0.35;
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
