/**
 * Asteroidle - Daily Manager & Arcade UI Controller
 * Manages 5-round puzzle progression, Calendar Archive, Stats Modal,
 * Wordle-style emoji sharing, Unlimited Mode, and Unified Game Settings Studio.
 */
import { 
    EPOCH_DATE_STR,
    generateDailyChallenges, 
    getTodayDateStr, 
    getPuzzleNumber, 
    getDateForPuzzleNumber,
    parseDate
} from './prng.js';
import { 
    recordDailyCompletion, 
    resetDailyCompletion,
    getStats, 
    getHistory, 
    getRecordForDate, 
    saveActiveState, 
    loadActiveState,
    clearActiveState,
    onStorageChange,
    waitForStorageReady
} from './storage.js';
import { AsteroidleEngine } from './asteroidle.js';
import './auth.js'; // Initializes Google Auth

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

export class DailyManager {
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
        this.bindStorageSync();
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

    bindStorageSync() {
        // Subscribe to real-time local/cloud storage updates across tabs & devices
        onStorageChange(({ stats, history }) => {
            this.onStorageUpdated(stats, history);
        });

        // Startup hydration gate: when cloud profile hydrates, seamlessly transition if completed
        waitForStorageReady().then(({ history }) => {
            if (!this.isUnlimited && history) {
                const rec = history[this.currentDateStr];
                if (rec && rec.completed && !this.isReviewMode) {
                    this.applyCompletedRecord(rec);
                }
            }
        });
    }

    onStorageUpdated(stats, history) {
        if (!this.isUnlimited && history) {
            const rec = history[this.currentDateStr];
            if (rec && rec.completed) {
                if (!this.isReviewMode) {
                    this.applyCompletedRecord(rec);
                } else {
                    const currentTotal = this.roundScores.reduce((a, b) => a + b, 0);
                    if (rec.totalScore !== undefined && rec.totalScore > currentTotal) {
                        this.roundScores = [...(rec.roundScores || this.roundScores)];
                        this.updateHeaderBanner();
                        this.updatePips();
                    }
                }
            }
        }

        // If stats modal is open, re-render it so streaks & scores update live
        const statsModal = document.getElementById('stats-modal');
        if (statsModal && statsModal.classList.contains('active')) {
            this.renderStatsModal();
        }

        // If archive modal is open, re-render it so calendar/list reflects synced completions
        const archiveModal = document.getElementById('archive-modal');
        if (archiveModal && archiveModal.classList.contains('active')) {
            this.renderArchiveModal();
        }
    }

    applyCompletedRecord(record) {
        if (!record || !record.completed) return;
        this.isReviewMode = true;
        this.roundScores = [...(record.roundScores || [0, 0, 0, 0, 0])];
        this.currentRound = 6;
        clearActiveState(this.currentDateStr);
        this.updateHeaderBanner();
        this.updatePips();

        // Dismiss floating telemetry result banner if active
        const resultBanner = document.getElementById('round-result-banner');
        if (resultBanner) {
            resultBanner.classList.remove('visible');
            resultBanner.style.display = 'none';
        }

        // Load Round 1 into arena for non-destructive review
        if (this.challenges && this.challenges[0]) {
            this.engine.loadChallenge(this.challenges[0]);
        }

        this.showResultsModal(record.totalScore);
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
            this.applyCompletedRecord(existing);
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
