/**
 * Asteroidle - Core Game Engine
 * Reuses the authentic Spaceship, Rock, Bullet, Starfield, SoundFX, and ParticleSystem
 * directly from Spaceship-Flight (game.js) via window.SpaceshipCore.
 */

export class AsteroidleEngine {
    constructor(canvas, onRoundComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onRoundComplete = onRoundComplete;

        // Core engine classes from game.js
        this.core = window.SpaceshipCore || {};
        const SoundFXClass = this.core.SoundFX || class {};
        const ParticleSystemClass = this.core.ParticleSystem || class {};
        const SpaceshipClass = this.core.Spaceship || class {};
        const StarfieldClass = this.core.Starfield || class {};

        this.soundFx = new SoundFXClass();
        const savedSound = localStorage.getItem('spaceship_flight_sound');
        if (this.soundFx) this.soundFx.enabled = (savedSound === 'true');

        this.particles = new ParticleSystemClass();
        this.ship = new SpaceshipClass(this.canvas, this.soundFx, this.particles);
        if (this.ship) this.ship.showStatusBars = false;
        
        // Restore user skin & scale preference from Spaceship Flight
        const savedSkin = localStorage.getItem('spaceship_flight_ship_skin') || 'red';
        if (this.ship) this.ship.selectedSkin = savedSkin;

        const savedScale = parseInt(localStorage.getItem('spaceship_flight_ship_scale') || '100', 10);
        if (this.ship && typeof this.ship.setScalePercent === 'function') {
            this.ship.setScalePercent(savedScale);
        }

        // Fullscreen authentic deep space starfield from game.js
        this.starfield = new StarfieldClass(this.canvas);

        // Challenge definition
        this.challenge = null;
        this.rock = null;
        this.rockInitialState = null;
        this.rockClipEndState = null;

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

        // Bullets
        this.testBullets = [];
        this.interceptBullet = null;
        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;
        this.roundScore = 0;
        this.resultTelemetry = null;

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

    /**
     * Fullscreen responsive canvas matching Spaceship Flight (game.js)
     */
    resizeCanvas() {
        const screenW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const screenH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const isPortrait = screenH > screenW;

        if (isPortrait) {
            // 16:9 widescreen canvas horizontally with letterbox padding
            this.canvas.width = Math.floor(screenW);
            this.canvas.height = Math.floor(screenW * (9 / 16));
        } else {
            // Fullscreen widescreen in landscape / desktop
            this.canvas.width = Math.floor(screenW);
            this.canvas.height = Math.floor(screenH);
        }

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Resize authentic starfield
        if (this.starfield && typeof this.starfield.resize === 'function') {
            this.starfield.resize();
        }

        // Adaptive Ship Sizing: authentic proportions decided in Spaceship Flight
        if (this.ship && typeof this.ship.recalculateSize === 'function') {
            this.ship.canvas = this.canvas;
            this.ship.recalculateSize();
        }

        if (this.challenge) {
            this.updateEntityPositions();
        }
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

    setShipScale(scalePercent) {
        if (this.ship && typeof this.ship.setScalePercent === 'function') {
            this.ship.setScalePercent(scalePercent);
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
        this.clipFrame = 0;

        this.updateEntityPositions();
        this.playClip();
    }

    updateEntityPositions() {
        if (!this.challenge) return;

        const W = this.width;
        const H = this.height;
        const ch = this.challenge;

        // Position the authentic spaceship at the fixed round coordinates
        this.ship.x = ch.shipX * W;
        this.ship.y = ch.shipY * H;
        this.ship.dx = 0;
        this.ship.dy = 0;

        // Initial heading is completely RANDOM (or deterministic per daily seed) - NEVER pre-aimed!
        const initialAngle = (ch.initialHeading !== undefined) ? ch.initialHeading : Math.floor(Math.random() * 360);
        this.ship.angle = initialAngle;
        this.updateAimUI();

        // Create the authentic Rock instance using SpaceshipCore.Rock
        const RockClass = this.core.Rock;
        if (!RockClass) return;

        this.rock = new RockClass(W, H, ch.speed);
        this.rock.shapeIndex = ch.shapeIndex % 5;

        // Apply challenge baseRadius scaled to arena dimensions
        const baseDimension = Math.min(W, Math.max(450, H * 1.6));
        const sizeFactor = baseDimension / 1000;
        if (ch.baseRadius) {
            this.rock.radius = ch.baseRadius * sizeFactor;
            this.rock.scale = (this.rock.radius / 25);
        }

        // Re-center polygon points for the chosen shape template
        const shapes = this.core.ROCK_SHAPES || [
            { x: [0, 25, 15, -5, -8], y: [0, 5, 30, 25, 15] },
            { x: [-18, 6, 26, 18, -8, -24], y: [-20, -26, -6, 22, 26, 6] },
            { x: [0, 20, 28, 12, -10, -26, -16], y: [-28, -14, 8, 26, 22, 2, -18] },
            { x: [-14, 10, 26, 20, 8, -14, -28, -20], y: [-24, -22, -4, 16, 28, 24, 6, -12] },
            { x: [-10, 14, 30, 16, -14, -24], y: [-30, -26, 6, 28, 30, -6] }
        ];
        const chosen = shapes[this.rock.shapeIndex];
        let sumX = 0, sumY = 0;
        for (let i = 0; i < chosen.x.length; i++) {
            sumX += chosen.x[i];
            sumY += chosen.y[i];
        }
        const avgX = sumX / chosen.x.length;
        const avgY = sumY / chosen.y.length;
        this.rock.localPoints = [];
        for (let i = 0; i < chosen.x.length; i++) {
            this.rock.localPoints.push({
                x: (chosen.x[i] - avgX) * this.rock.scale * 1.5,
                y: (chosen.y[i] - avgY) * this.rock.scale * 1.5
            });
        }

        // Spawn position: support arbitrary origins (center, interior quadrants, or perimeter)
        let startX, startY, moveAngle;
        if (ch.startX !== undefined && ch.startY !== undefined) {
            startX = ch.startX * W;
            startY = ch.startY * H;
            if (ch.moveAngle !== undefined) {
                moveAngle = ch.moveAngle;
            } else if (ch.targetX !== undefined && ch.targetY !== undefined) {
                moveAngle = Math.atan2(ch.targetY * H - startY, ch.targetX * W - startX);
            } else {
                moveAngle = Math.random() * Math.PI * 2;
            }
        } else {
            // Legacy perimeter edge spawn fallback
            const offset = 30;
            if (ch.side === 0) { // Left
                startX = -this.rock.radius - offset;
                startY = ch.sidePos * H;
            } else if (ch.side === 1) { // Top
                startX = ch.sidePos * W;
                startY = -this.rock.radius - offset;
            } else if (ch.side === 2) { // Right
                startX = W + this.rock.radius + offset;
                startY = ch.sidePos * H;
            } else { // Bottom
                startX = ch.sidePos * W;
                startY = H + this.rock.radius + offset;
            }
            const targetX = ch.targetX * W;
            const targetY = ch.targetY * H;
            moveAngle = Math.atan2(targetY - startY, targetX - startX);
        }

        const speedMagnitude = (2.2 * ch.speed) * (W / 800);

        this.rock.x = startX;
        this.rock.y = startY;
        this.rock.dx = Math.cos(moveAngle) * speedMagnitude;
        this.rock.dy = Math.sin(moveAngle) * speedMagnitude;
        this.rock.rotation = 0;
        this.rock.rotSpeed = ch.rotSpeed;

        // Cache initial state
        this.rockInitialState = {
            x: startX,
            y: startY,
            dx: this.rock.dx,
            dy: this.rock.dy,
            rotation: 0,
            rotSpeed: this.rock.rotSpeed
        };

        // Precompute where the asteroid will be at t = 1.0s (frame 60)
        this.rockClipEndState = {
            x: startX + this.rock.dx * this.clipDurationFrames,
            y: startY + this.rock.dy * this.clipDurationFrames,
            dx: this.rock.dx,
            dy: this.rock.dy,
            rotation: this.rock.rotSpeed * this.clipDurationFrames,
            rotSpeed: this.rock.rotSpeed
        };
    }

    /**
     * Replay the 1-second preview clip
     */
    playClip() {
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
        if (!this.ship) return;
        this.ship.angle = Math.round((deg % 360 + 360) % 360);
        this.updateAimUI();
    }

    adjustAngle(deltaDeg) {
        if (!this.ship) return;
        this.setAngle(this.ship.angle + deltaDeg);
    }

    aimAtPoint(px, py) {
        if (!this.ship) return;
        const rad = Math.atan2(py - this.ship.y, px - this.ship.x);
        const deg = (rad * 180 / Math.PI) + 90;
        this.setAngle(deg);
    }

    /**
     * Test-fire a tracer bullet (uses standard bullet speed from game.js)
     */
    testFire() {
        if (this.state === 'FIRING' || !this.ship) return;

        const rad = ((this.ship.angle - 90) * Math.PI) / 180;
        const noseDist = this.ship.height * 0.55;
        const bx = this.ship.x + Math.cos(rad) * noseDist;
        const by = this.ship.y + Math.sin(rad) * noseDist;
        const scale = this.core.getScreenScale ? this.core.getScreenScale(this.canvas) : 1.0;

        const BulletClass = this.core.Bullet;
        if (BulletClass) {
            const b = new BulletClass(bx, by, this.ship.angle, 0, 0, scale);
            b.isTracer = true;
            this.testBullets.push(b);
        }

        if (this.soundFx && typeof this.soundFx.playLaser === 'function') {
            this.soundFx.playLaser();
        }
    }

    /**
     * Commit the real interception shot using the standard game Bullet!
     */
    fireInterceptShot() {
        if (this.state !== 'AIMING' && this.state !== 'PREVIEW') return;
        if (!this.ship) return;

        // Ensure rock is placed at the t = 1.0s clip end position
        this.restoreRockState(this.rockClipEndState);
        this.state = 'FIRING';
        this.isPlayingClip = false;

        const rad = ((this.ship.angle - 90) * Math.PI) / 180;
        const noseDist = this.ship.height * 0.55;
        const bx = this.ship.x + Math.cos(rad) * noseDist;
        const by = this.ship.y + Math.sin(rad) * noseDist;
        const scale = this.core.getScreenScale ? this.core.getScreenScale(this.canvas) : 1.0;

        const BulletClass = this.core.Bullet;
        if (BulletClass) {
            this.interceptBullet = new BulletClass(bx, by, this.ship.angle, 0, 0, scale);
        }

        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;

        if (this.soundFx && typeof this.soundFx.playLaser === 'function') {
            this.soundFx.playLaser();
        }
    }

    setupInputHandlers() {
        let isPointerDown = false;

        const handlePointer = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const px = clientX - rect.left;
            const py = clientY - rect.top;
            this.aimAtPoint(px, py);
        };

        this.canvas.addEventListener('mousedown', (e) => {
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
            isPointerDown = true;
            handlePointer(e);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (isPointerDown) handlePointer(e);
        }, { passive: false });

        window.addEventListener('touchend', () => {
            isPointerDown = false;
        });

        // Continuous arrow key rotation matching game.js exactly (4.5 deg/frame)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = true;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = true;
            } else if (e.code === 'KeyT') {
                this.testFire();
            } else if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === 'AIMING' || this.state === 'PREVIEW') {
                    this.fireInterceptShot();
                }
            } else if (e.code === 'KeyR') {
                this.playClip();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = false;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = false;
            }
        });

        // Bind on-screen tactile buttons (identical to Spaceship Flight touch controls)
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
            replayBtn.addEventListener('click', () => this.playClip());
        }

        if (testFireBtn) {
            testFireBtn.addEventListener('click', () => this.testFire());
        }

        document.querySelectorAll('.finetune-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const step = parseFloat(btn.dataset.step || '0');
                this.adjustAngle(step);
            });
        });
    }

    updateAimUI() {
        if (!this.ship) return;
        const deg = Math.round((this.ship.angle % 360 + 360) % 360);
        const degElem = document.getElementById('telemetry-angle-val');
        if (degElem) degElem.textContent = `${deg}°`;
    }

    loop(timestamp) {
        const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        this.animId = requestAnimationFrame(this.loop);
    }

    update(dt) {
        // Starfield gentle parallax update
        if (this.starfield && typeof this.starfield.update === 'function') {
            this.starfield.update(0.25, 0);
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake *= 0.9;
            if (this.screenShake < 0.5) this.screenShake = 0;
        }

        // Continuous keyboard rotation (using ship.rotateLeft / rotateRight from game.js)
        if (this.ship && (this.state === 'AIMING' || this.state === 'PREVIEW')) {
            if (this.keys.left) {
                this.ship.rotateLeft();
                this.updateAimUI();
            }
            if (this.keys.right) {
                this.ship.rotateRight();
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
                b.update(this.width, this.height);
            } else {
                b.x += b.dx;
                b.y += b.dy;
            }
            if (b.hit || b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) {
                this.testBullets.splice(i, 1);
            }
        }

        // Clip preview playback
        if (this.state === 'PREVIEW' && this.rock) {
            this.clipFrame++;
            this.rock.x += this.rock.dx;
            this.rock.y += this.rock.dy;
            this.rock.rotation += this.rock.rotSpeed;

            if (this.clipFrame >= this.clipDurationFrames) {
                if (this.loopClip) {
                    this.playClip();
                } else {
                    this.stopClipAtEnd();
                }
            }
            return;
        }

        // Intercept shot execution
        if (this.state === 'FIRING' && this.interceptBullet && this.rock) {
            const b = this.interceptBullet;
            if (typeof b.update === 'function') {
                b.update(this.width, this.height);
            } else {
                b.x += b.dx;
                b.y += b.dy;
            }

            // Move rock forward in lockstep
            this.rock.x += this.rock.dx;
            this.rock.y += this.rock.dy;
            this.rock.rotation += this.rock.rotSpeed;

            // Collision check using authentic rock.containsBullet from game.js
            let hit = false;
            if (typeof this.rock.containsBullet === 'function') {
                hit = this.rock.containsBullet(b);
            } else {
                const d = Math.hypot(b.x - this.rock.x, b.y - this.rock.y);
                hit = d <= this.rock.radius;
            }

            // Exact continuous surface distance calculation to polygon edge segments
            let surfaceDist;
            const pts = typeof this.rock.getTransformedPoints === 'function' ? this.rock.getTransformedPoints() : null;
            if (pts && typeof this.rock.distToSegmentSquared === 'function') {
                let minEdgeDistSq = Infinity;
                for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                    const dSq = this.rock.distToSegmentSquared(b.x, b.y, pts[j].x, pts[j].y, pts[i].x, pts[i].y);
                    if (dSq < minEdgeDistSq) minEdgeDistSq = dSq;
                }
                surfaceDist = Math.sqrt(minEdgeDistSq);
            } else {
                surfaceDist = Math.max(0, Math.hypot(b.x - this.rock.x, b.y - this.rock.y) - this.rock.radius);
            }

            const centerDist = Math.hypot(b.x - this.rock.x, b.y - this.rock.y);
            if (surfaceDist < this.minSurfaceDistance) {
                this.minSurfaceDistance = surfaceDist;
                this.closestDistance = centerDist;
            }

            if (hit) {
                this.directHit = true;
                this.minSurfaceDistance = 0;
                this.screenShake = 18;
                this.resolveRound(true);
                return;
            }

            // Check if bullet exited arena
            const margin = 50;
            if (b.hit || b.x < -margin || b.x > this.width + margin || b.y < -margin || b.y > this.height + margin) {
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
                this.particles.addExplosion(this.interceptBullet.x, this.interceptBullet.y, '#facc15', 35);
            }
            this.resultTelemetry = {
                score: 100,
                isHit: true,
                message: "🎯 DIRECT HIT! (100 PTS)",
                subtext: "Perfect ballistic lead solution."
            };
        } else {
            // Normalized continuous Surface Proximity:
            const M = this.minSurfaceDistance / R;
            if (M <= 3.0) {
                score = Math.max(0, Math.round(100 * Math.pow(1 - (M / 3.0), 1.5)));
            } else {
                score = 0;
            }

            const optimalRad = Math.atan2(this.rock.y - this.ship.y, this.rock.x - this.ship.x);
            const optimalDeg = ((optimalRad * 180 / Math.PI) + 90 + 360) % 360;
            let angleDiff = Math.abs(this.ship.angle - optimalDeg);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;

            this.resultTelemetry = {
                score,
                isHit: false,
                message: score > 75 ? "⚡ GRAZING NEAR-MISS!" : score > 40 ? "⚠️ CLOSE SHAVE" : "❌ BALLISTIC DEFLECTION",
                subtext: `Missed by ${M.toFixed(2)}x rock radii (Angle error: ~${angleDiff.toFixed(1)}°)`
            };
        }

        this.roundScore = score;
        if (this.onRoundComplete) {
            this.onRoundComplete(this.roundScore, this.resultTelemetry);
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;

        ctx.save();

        // Screen shake effect on impact
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(sx, sy);
        }

        // 1. Authentic deep space starfield from game.js
        if (this.starfield && typeof this.starfield.draw === 'function') {
            this.starfield.draw(ctx);
        } else {
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, W, H);
        }

        // 2. Asteroid (using authentic rock.draw from game.js)
        if (this.rock && !this.rock.popped) {
            if (typeof this.rock.draw === 'function') {
                this.rock.draw(ctx);
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

        // 6. Authentic Spaceship sprite from game.js (exact proportions!)
        if (this.ship && typeof this.ship.draw === 'function') {
            this.ship.draw(ctx);
        }

        // 7. Clip reconnaissance progress bar
        if (this.state === 'PREVIEW') {
            this.renderClipOverlay(ctx, W, H);
        }

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
