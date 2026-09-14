/**
 * Asteroidle - Daily Manager & UI Controller
 * Manages 5-round puzzle progression, Calendar Archive, Stats Modal,
 * Wordle-style emoji sharing, and Unlimited Mode.
 */
import { 
    generateDailyChallenges, 
    getTodayDateStr, 
    getPuzzleNumber, 
    parseDate, 
    formatDate,
    createMulberry32,
    hashString
} from './prng.js';
import { 
    recordDailyCompletion, 
    getStats, 
    getHistory, 
    getRecordForDate,
    saveActiveState,
    loadActiveState
} from './storage.js';
import { AsteroidleEngine } from './asteroidle.js';
import './auth.js'; // Initializes Google Auth

export class DailyManager {
    constructor() {
        this.isUnlimited = false;
        this.currentDateStr = getTodayDateStr();
        this.puzzleNum = getPuzzleNumber(this.currentDateStr);
        this.challenges = [];
        this.currentRound = 1; // 1 to 5
        this.roundScores = [];
        this.engine = null;

        this.initDOM();
        this.checkURLParams();
        this.setupModals();
        this.startPuzzle(this.currentDateStr);
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        const modeParam = urlParams.get('mode');

        if (modeParam === 'unlimited') {
            this.isUnlimited = true;
        } else if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            this.currentDateStr = dateParam;
            this.puzzleNum = getPuzzleNumber(dateParam);
        }
    }

    initDOM() {
        const canvas = document.getElementById('asteroidle-canvas');
        this.engine = new AsteroidleEngine(canvas, (score, telem) => {
            this.onRoundResolved(score, telem);
        });

        // Controls bindings
        document.getElementById('btn-replay-clip')?.addEventListener('click', () => {
            this.engine.playClip();
        });

        document.getElementById('btn-test-fire')?.addEventListener('click', () => {
            this.engine.testFire();
        });

        document.getElementById('btn-fire-intercept')?.addEventListener('click', () => {
            this.engine.fireInterceptShot();
        });

        // Angle Dial & Steppers
        const dial = document.getElementById('angle-dial-input');
        if (dial) {
            dial.addEventListener('input', (e) => {
                this.engine.setAngle(Number(e.target.value));
            });
        }

        document.getElementById('btn-step-minus-5')?.addEventListener('click', () => this.engine.adjustAngle(-5));
        document.getElementById('btn-step-minus-1')?.addEventListener('click', () => this.engine.adjustAngle(-1));
        document.getElementById('btn-step-plus-1')?.addEventListener('click', () => this.engine.adjustAngle(1));
        document.getElementById('btn-step-plus-5')?.addEventListener('click', () => this.engine.adjustAngle(5));

        // Mode switch
        const modeBtn = document.getElementById('btn-toggle-mode');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                this.isUnlimited = !this.isUnlimited;
                this.updateModeButton();
                if (this.isUnlimited) {
                    this.startUnlimitedPuzzle();
                } else {
                    this.startPuzzle(getTodayDateStr());
                }
            });
        }

        this.updateModeButton();
    }

    updateModeButton() {
        const modeBtn = document.getElementById('btn-toggle-mode');
        if (!modeBtn) return;
        if (this.isUnlimited) {
            modeBtn.innerHTML = '📅 Play Daily Mode';
            modeBtn.classList.add('unlimited-active');
        } else {
            modeBtn.innerHTML = '♾️ Play Unlimited Mode';
            modeBtn.classList.remove('unlimited-active');
        }
    }

    startPuzzle(dateStr) {
        this.currentDateStr = dateStr;
        this.puzzleNum = getPuzzleNumber(dateStr);
        this.challenges = generateDailyChallenges(dateStr);
        this.roundScores = [];
        this.currentRound = 1;

        // Check if already completed today
        const existing = getRecordForDate(dateStr);
        if (existing && existing.completed) {
            this.roundScores = existing.roundScores || [0, 0, 0, 0, 0];
            this.renderRoundNodes();
            this.showResultsModal(existing.totalScore, true);
            return;
        }

        // Restore active progress if partially played
        const saved = loadActiveState(dateStr);
        if (saved && saved.round > 1 && Array.isArray(saved.scores)) {
            this.currentRound = saved.round;
            this.roundScores = saved.scores;
        }

        this.updateHeaderBanner();
        this.loadCurrentRound();
    }

    startUnlimitedPuzzle() {
        const randomSeed = `unlimited-${Date.now()}-${Math.random()}`;
        this.currentDateStr = 'UNLIMITED';
        this.puzzleNum = Math.floor(Math.random() * 9000) + 1000;
        const rng = createMulberry32(hashString(randomSeed));
        
        // Generate 5 challenges ensuring one of each of the 5 rock shapes
        const shapes = [0, 1, 2, 3, 4];
        for (let i = shapes.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
        }

        this.challenges = [];
        for (let r = 1; r <= 5; r++) {
            this.challenges.push({
                round: r,
                shapeIndex: shapes[r - 1],
                baseRadius: 18 + rng() * 18,
                speed: 0.9 + rng() * 0.5,
                rotSpeed: (rng() - 0.5) * 0.06,
                bulletTier: Math.floor(rng() * 5) + 1,
                side: Math.floor(rng() * 4),
                sidePos: 0.2 + rng() * 0.6,
                targetX: 0.3 + rng() * 0.4,
                targetY: 0.3 + rng() * 0.4,
                shipX: 0.25 + rng() * 0.5,
                shipY: 0.25 + rng() * 0.5
            });
        }

        this.roundScores = [];
        this.currentRound = 1;
        this.updateHeaderBanner();
        this.loadCurrentRound();
    }

    updateHeaderBanner() {
        const titleElem = document.getElementById('daily-puzzle-title');
        if (titleElem) {
            if (this.isUnlimited) {
                titleElem.textContent = `ASTEROIDLE (UNLIMITED SECTOR #${this.puzzleNum})`;
            } else {
                titleElem.textContent = `ASTEROIDLE #${this.puzzleNum} — ${this.currentDateStr}`;
            }
        }
        this.renderRoundNodes();
    }

    renderRoundNodes() {
        const container = document.getElementById('round-progress-nodes');
        if (!container) return;

        let html = '';
        for (let i = 1; i <= 5; i++) {
            let cls = 'round-node';
            let label = `R${i}`;
            let scoreText = '';

            if (i < this.currentRound || (this.roundScores[i - 1] !== undefined)) {
                const s = this.roundScores[i - 1] || 0;
                if (s === 100) cls += ' direct-hit';
                else if (s >= 75) cls += ' high-score';
                else if (s >= 35) cls += ' mid-score';
                else cls += ' low-score';
                scoreText = `<span class="node-score">${s}</span>`;
            } else if (i === this.currentRound) {
                cls += ' current';
            }

            html += `
                <div class="${cls}">
                    <span class="node-label">${label}</span>
                    ${scoreText}
                </div>
            `;
        }
        container.innerHTML = html;
    }

    loadCurrentRound() {
        if (this.currentRound > 5) {
            this.finalizePuzzle();
            return;
        }

        const ch = this.challenges[this.currentRound - 1];
        if (!ch) return;

        // Update Tier display badge
        const tierBadge = document.getElementById('cannon-tier-badge');
        if (tierBadge) {
            tierBadge.textContent = this.engine.getTierName(ch.bulletTier);
        }

        // Hide result banner, show aiming
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) resultBanner.classList.remove('visible');

        const controls = document.getElementById('fire-controls-bar');
        if (controls) controls.style.display = 'flex';

        this.renderRoundNodes();
        this.engine.loadChallenge(ch);
    }

    onRoundResolved(score, telem) {
        this.roundScores[this.currentRound - 1] = score;

        if (!this.isUnlimited) {
            saveActiveState(this.currentDateStr, this.currentRound, this.roundScores);
        }

        this.renderRoundNodes();

        // Show banner telemetry
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) {
            resultBanner.innerHTML = `
                <div class="banner-title ${telem.isHit ? 'hit' : 'miss'}">${telem.message}</div>
                <div class="banner-sub">${telem.subtext}</div>
                <button id="btn-next-asteroid" class="primary-btn next-btn">
                    ${this.currentRound < 5 ? 'NEXT ASTEROID →' : 'SEE FINAL RESULTS 📊'}
                </button>
            `;
            resultBanner.classList.add('visible');

            const nextBtn = document.getElementById('btn-next-asteroid');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    resultBanner.classList.remove('visible');
                    this.currentRound++;
                    if (this.currentRound <= 5) {
                        this.loadCurrentRound();
                    } else {
                        this.finalizePuzzle();
                    }
                });
            }
        }
    }

    finalizePuzzle() {
        const total = this.roundScores.reduce((a, b) => a + b, 0);

        if (!this.isUnlimited) {
            recordDailyCompletion(this.currentDateStr, this.puzzleNum, this.roundScores, total);
        }

        this.showResultsModal(total, false);
    }

    showResultsModal(totalScore, wasAlreadyPlayed = false) {
        const modal = document.getElementById('results-modal');
        if (!modal) return;

        const scoreVal = document.getElementById('results-total-score');
        if (scoreVal) scoreVal.textContent = `${totalScore} / 500`;

        const list = document.getElementById('results-rounds-list');
        if (list) {
            list.innerHTML = this.roundScores.map((s, idx) => {
                const badge = s === 100 ? '🟢 DIRECT HIT (100)' : s >= 75 ? `🟡 NEAR MISS (${s})` : s >= 35 ? `🟠 GRAZE (${s})` : `🔴 DEFLECTION (${s})`;
                return `<div class="result-row"><span>Asteroid ${idx + 1}</span><span class="score-pill">${badge}</span></div>`;
            }).join('');
        }

        // Countdown timer to midnight
        this.updateMidnightCountdown();

        // Share button
        const shareBtn = document.getElementById('btn-share-score');
        if (shareBtn) {
            shareBtn.onclick = () => this.shareScore(totalScore);
        }

        modal.classList.add('active');
    }

    shareScore(totalScore) {
        const emojis = this.roundScores.map(s => {
            if (s === 100) return '🟢 100';
            if (s >= 75) return `🟡  ${s}`;
            if (s >= 35) return `🟠  ${s}`;
            return `🔴  ${s}`;
        });

        const shareText = `Asteroidle #${this.puzzleNum} 🎯 ${totalScore}/500\n` +
            emojis.map((e, idx) => `🪨 R${idx + 1}: ${e}`).join('\n') +
            `\nhttps://amitjoshi2724.github.io/Spaceship-Flight/asteroidle`;

        navigator.clipboard.writeText(shareText).then(() => {
            this.showToast('Copied result to clipboard! 📋');
        }).catch(() => {
            alert(shareText);
        });
    }

    showToast(msg) {
        let toast = document.getElementById('game-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'game-toast';
            toast.className = 'game-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2500);
    }

    updateMidnightCountdown() {
        const countdownElem = document.getElementById('countdown-timer');
        if (!countdownElem) return;

        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            const diffMs = tomorrow - now;

            const h = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
            const m = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const s = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');

            countdownElem.textContent = `${h}:${m}:${s}`;
        };
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    setupModals() {
        // Close modal buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-backdrop');
                if (modal) modal.classList.remove('active');
            });
        });

        // Close on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });

        // Help Modal
        document.getElementById('btn-help')?.addEventListener('click', () => {
            document.getElementById('help-modal')?.classList.add('active');
        });

        // Stats Modal
        document.getElementById('btn-stats')?.addEventListener('click', () => {
            this.renderStatsModal();
            document.getElementById('stats-modal')?.classList.add('active');
        });

        // Archive Modal
        document.getElementById('btn-archive')?.addEventListener('click', () => {
            this.renderArchiveModal();
            document.getElementById('archive-modal')?.classList.add('active');
        });
    }

    renderStatsModal() {
        const stats = getStats();
        document.getElementById('stat-played').textContent = stats.played;
        document.getElementById('stat-win-rate').textContent = stats.played > 0 ? `${Math.round((stats.won / stats.played) * 100)}%` : '0%';
        document.getElementById('stat-current-streak').textContent = stats.currentStreak;
        document.getElementById('stat-max-streak').textContent = stats.maxStreak;
        document.getElementById('stat-high-score').textContent = stats.highScore;
        document.getElementById('stat-avg-score').textContent = stats.played > 0 ? Math.round(stats.totalScore / stats.played) : 0;

        // Histogram
        const distContainer = document.getElementById('stats-distribution-chart');
        if (distContainer) {
            const keys = ['0-100', '101-200', '201-300', '301-400', '401-500'];
            const maxVal = Math.max(1, ...keys.map(k => stats.distribution[k] || 0));

            distContainer.innerHTML = keys.map(k => {
                const count = stats.distribution[k] || 0;
                const pct = Math.max(7, Math.round((count / maxVal) * 100));
                return `
                    <div class="histogram-row">
                        <span class="bracket-label">${k}</span>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${pct}%">${count}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    renderArchiveModal() {
        const history = getHistory();
        const listElem = document.getElementById('archive-puzzle-list');
        if (!listElem) return;

        const today = new Date();
        const items = [];

        // List past 30 days
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = formatDate(d);
            const pNum = getPuzzleNumber(dateStr);
            const record = history[dateStr];

            items.push({
                dateStr,
                pNum,
                record
            });
        }

        listElem.innerHTML = items.map(item => {
            const isToday = item.dateStr === getTodayDateStr();
            const isSolved = item.record && item.record.completed;
            const scoreText = isSolved ? `⭐ ${item.record.totalScore} pts` : isToday ? '⏳ Today' : '⚪ Unplayed';
            const statusClass = isSolved ? 'solved' : isToday ? 'today' : 'unplayed';

            return `
                <div class="archive-card ${statusClass}" data-date="${item.dateStr}">
                    <div class="archive-info">
                        <span class="archive-number">#${item.pNum}</span>
                        <span class="archive-date">${item.dateStr}</span>
                    </div>
                    <div class="archive-action">
                        <span class="archive-badge">${scoreText}</span>
                        <button class="archive-play-btn" data-date="${item.dateStr}">Play</button>
                    </div>
                </div>
            `;
        }).join('');

        listElem.querySelectorAll('.archive-play-btn').forEach(btn => {
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

// Boot DailyManager on load
window.addEventListener('DOMContentLoaded', () => {
    window.asteroidleApp = new DailyManager();
});
