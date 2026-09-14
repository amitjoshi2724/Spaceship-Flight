/**
 * Asteroidle - Daily Manager & Arcade UI Controller
 * Manages 5-round puzzle progression, Calendar Archive, Stats Modal,
 * Wordle-style emoji sharing, Unlimited Mode, and Game Settings.
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
        this.setupSettings();
        this.startPuzzle(this.currentDateStr);
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        const modeParam = urlParams.get('mode');

        if (modeParam === 'unlimited') {
            this.isUnlimited = true;
            this.updateModeButton();
            this.startUnlimitedPuzzle();
            return;
        }

        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            this.currentDateStr = dateParam;
            this.puzzleNum = getPuzzleNumber(dateParam);
        }
    }

    initDOM() {
        const canvas = document.getElementById('gameCanvas') || document.getElementById('asteroidle-canvas');
        this.engine = new AsteroidleEngine(canvas, (score, telem) => {
            this.onRoundResolved(score, telem);
        });

        // Mode switch
        const modeBtn = document.getElementById('mode-toggle-btn');
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

        // Sound Toggle in Top HUD
        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) {
            const isSoundOn = localStorage.getItem('spaceship_flight_sound') === 'true';
            soundBtn.textContent = isSoundOn ? '🔊' : '🔇';
            soundBtn.addEventListener('click', () => {
                const nextState = !(localStorage.getItem('spaceship_flight_sound') === 'true');
                this.engine.setSound(nextState);
                soundBtn.textContent = nextState ? '🔊' : '🔇';
                const settingSound = document.getElementById('settingSound');
                if (settingSound) settingSound.checked = nextState;
            });
        }

        // Next Round button in result banner
        const nextBtn = document.getElementById('next-round-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.advanceNextRound());
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

    updateModeButton() {
        const modeBtn = document.getElementById('mode-toggle-btn');
        if (!modeBtn) return;
        if (this.isUnlimited) {
            modeBtn.textContent = 'DAILY';
            modeBtn.classList.add('unlimited-active');
            modeBtn.title = 'Switch to Daily Puzzle Mode';
        } else {
            modeBtn.textContent = 'UNLIMITED';
            modeBtn.classList.remove('unlimited-active');
            modeBtn.title = 'Switch to Unlimited Practice Mode';
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
            this.updateHeaderBanner();
            this.updatePips();
            this.showResultsModal(existing.totalScore);
            return;
        }

        // Restore active progress if partially played
        const saved = loadActiveState(dateStr);
        if (saved && saved.round > 1 && Array.isArray(saved.scores)) {
            this.currentRound = Math.min(5, saved.round);
            this.roundScores = saved.scores;
        }

        this.updateHeaderBanner();
        this.updatePips();
        this.loadCurrentRound();
    }

    startUnlimitedPuzzle() {
        const randomSeed = `unlimited-${Date.now()}-${Math.random()}`;
        this.currentDateStr = 'UNLIMITED';
        this.puzzleNum = Math.floor(Math.random() * 9000) + 1000;
        const rng = createMulberry32(hashString(randomSeed));
        
        // Guarantee exactly one of each of the 5 canonical rock shapes
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
                bulletTier: 3,
                side: Math.floor(rng() * 4),
                sidePos: 0.2 + rng() * 0.6,
                targetX: 0.3 + rng() * 0.4,
                targetY: 0.3 + rng() * 0.4,
                shipX: 0.25 + rng() * 0.5,
                shipY: 0.25 + rng() * 0.5,
                initialHeading: Math.floor(rng() * 360)
            });
        }

        this.roundScores = [];
        this.currentRound = 1;
        this.updateHeaderBanner();
        this.updatePips();
        this.loadCurrentRound();
    }

    updateHeaderBanner() {
        const pNumBadge = document.getElementById('puzzle-number-badge');
        const pDateLabel = document.getElementById('puzzle-date-label');
        if (pNumBadge) {
            pNumBadge.textContent = this.isUnlimited ? `SECTOR #${this.puzzleNum}` : `ASTEROIDLE #${this.puzzleNum}`;
        }
        if (pDateLabel) {
            pDateLabel.textContent = this.isUnlimited ? `UNLIMITED MISSION` : this.currentDateStr;
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
        if (resultBanner) resultBanner.classList.remove('visible');

        this.updateHeaderBanner();
        this.updatePips();
        this.engine.loadChallenge(ch);
    }

    onRoundResolved(score, telem) {
        this.roundScores[this.currentRound - 1] = score;

        if (!this.isUnlimited) {
            saveActiveState(this.currentDateStr, this.currentRound, this.roundScores);
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
            nextBtn.textContent = this.currentRound < 5 ? 'NEXT ASTEROID [SPACE] ➔' : 'VIEW MISSION INTEL [SPACE] 📊';
        }

        if (resultBanner) resultBanner.classList.add('visible');
    }

    advanceNextRound() {
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) resultBanner.classList.remove('visible');

        this.currentRound++;
        if (this.currentRound <= 5) {
            this.loadCurrentRound();
        } else {
            this.finalizePuzzle();
        }
    }

    finalizePuzzle() {
        const total = this.roundScores.reduce((a, b) => a + b, 0);

        if (!this.isUnlimited) {
            recordDailyCompletion(this.currentDateStr, this.puzzleNum, this.roundScores, total);
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
            btn.addEventListener('click', (e) => {
                const targetId = btn.dataset.close;
                if (targetId) {
                    document.getElementById(targetId)?.classList.remove('active');
                } else {
                    btn.closest('.modal-backdrop, .overlay')?.classList.remove('active');
                }
            });
        });

        // Close on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });

        // Help Modal
        document.getElementById('help-modal-btn')?.addEventListener('click', () => {
            document.getElementById('help-modal')?.classList.add('active');
        });

        // Stats Modal
        document.getElementById('stats-modal-btn')?.addEventListener('click', () => {
            this.renderStatsModal();
            document.getElementById('stats-modal')?.classList.add('active');
        });

        // Archive Modal
        document.getElementById('archive-modal-btn')?.addEventListener('click', () => {
            this.renderArchiveModal();
            document.getElementById('archive-modal')?.classList.add('active');
        });

        // Share Intel button
        document.getElementById('share-score-btn')?.addEventListener('click', () => {
            this.shareScore();
        });
    }

    setupSettings() {
        const settingsModal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeBtn = document.getElementById('closeSettingsBtn');

        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
        }
        if (closeBtn && settingsModal) {
            closeBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        }

        // Ship Skin Selection
        const redBtn = document.getElementById('selectRedShip');
        const blueBtn = document.getElementById('selectBlueShip');
        const currentSkin = localStorage.getItem('spaceship_flight_ship_skin') || 'red';

        if (currentSkin === 'blue') {
            blueBtn?.classList.add('active');
            redBtn?.classList.remove('active');
        } else {
            redBtn?.classList.add('active');
            blueBtn?.classList.remove('active');
        }

        const updateSkin = (skin) => {
            this.engine.setShipSkin(skin);
            if (skin === 'blue') {
                blueBtn?.classList.add('active');
                redBtn?.classList.remove('active');
            } else {
                redBtn?.classList.add('active');
                blueBtn?.classList.remove('active');
            }
        };

        redBtn?.addEventListener('click', () => updateSkin('red'));
        blueBtn?.addEventListener('click', () => updateSkin('blue'));

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

        // Touch Controls Visibility Selector
        const touchSelect = document.getElementById('settingTouchControls');
        const touchControls = document.getElementById('touchControls');
        const savedTouch = localStorage.getItem('spaceship_flight_touch_visibility') || 'auto';
        if (touchSelect) {
            touchSelect.value = savedTouch;
            if (touchControls) {
                touchControls.classList.toggle('hidden', savedTouch === 'hidden');
            }

            touchSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                try { localStorage.setItem('spaceship_flight_touch_visibility', val); } catch (err) { }
                if (touchControls) {
                    touchControls.classList.toggle('hidden', val === 'hidden');
                }
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

            distContainer.innerHTML = keys.map(k => {
                const count = stats.distribution[k] || 0;
                const pct = Math.max(8, Math.round((count / maxVal) * 100));
                return `
                    <div class="dist-row">
                        <span class="dist-label">${k}</span>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill" style="width: ${pct}%">${count}</div>
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
                return `<div class="round-block ${cls}"><span class="block-label">R${r}</span><span class="block-val">${text}</span></div>`;
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

        const shareText = `Asteroidle #${this.puzzleNum} 🎯 ${total}/500\n` +
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

    renderArchiveModal() {
        const history = getHistory();
        const listElem = document.getElementById('archive-list-container');
        if (!listElem) return;

        const today = new Date();
        const items = [];

        // Past 30 Days (Semantle / Wordle archive format)
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = formatDate(d);
            const pNum = getPuzzleNumber(dateStr);
            const record = history[dateStr];

            items.push({
                dateStr,
                pNum,
                isToday: i === 0,
                completed: record && record.completed,
                score: record ? record.totalScore : null
            });
        }

        listElem.innerHTML = items.map(item => {
            let statusClass = 'status-pending';
            let scoreText = 'Unplayed';
            if (item.completed) {
                statusClass = 'status-completed';
                scoreText = `Score: ${item.score}/500`;
            } else if (item.isToday) {
                statusClass = 'status-today';
                scoreText = 'Today\'s Mission';
            }

            return `
                <div class="archive-card ${statusClass}" data-date="${item.dateStr}">
                    <div class="archive-info">
                        <span class="archive-number">#${item.pNum}</span>
                        <span class="archive-date">${item.dateStr}</span>
                    </div>
                    <div class="archive-action">
                        <span class="archive-badge">${scoreText}</span>
                        <button class="archive-play-btn menu-btn" data-date="${item.dateStr}">Play</button>
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
