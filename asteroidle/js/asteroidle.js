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

export class AsteroidleEngine {
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
                    0,
                    0,
                    endState.x,
                    endState.y,
                    endState.dx,
                    endState.dy,
                    this.currentBulletSpeed || 14.0,
                    muzzleOffset
                )
                : null;

            let optimalDeg;
            if (sol && typeof sol.headingDeg === 'number') {
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
