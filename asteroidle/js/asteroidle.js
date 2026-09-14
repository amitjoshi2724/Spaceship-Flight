/**
 * Asteroidle - Core Game Engine
 * Features 1-second asteroid clip replay, ship aiming, bullet speed tiers (1-5),
 * continuous collision detection, normalized surface-proximity scoring, and telemetry.
 */

export class AsteroidleEngine {
    constructor(canvas, onRoundComplete) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onRoundComplete = onRoundComplete;

        // Core classes from game.js
        this.core = window.SpaceshipCore || {};
        this.soundFx = new (this.core.SoundFx || Object)();
        this.particles = new (this.core.ParticleSystem || Object)();

        // Ship and aim state
        this.shipX = 0;
        this.shipY = 0;
        this.shipAngle = 0; // Degrees (0 = UP)
        this.targetAngle = 0;

        // Challenge definition
        this.challenge = null;
        this.rock = null;
        this.rockInitialState = null;
        this.rockClipEndState = null;

        // Playback state
        // States: 'PREVIEW' (1s clip), 'AIMING' (waiting for fire), 'FIRING' (shot in flight), 'RESOLVED'
        this.state = 'AIMING';
        this.clipDurationFrames = 60; // 1.0 second at 60fps
        this.clipFrame = 0;
        this.loopClip = false;
        this.isPlayingClip = false;

        // Bullets
        this.testBullets = [];
        this.interceptBullet = null;
        this.bulletSpeedTier = 3;
        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;
        this.roundScore = 0;
        this.resultTelemetry = null;

        // Animation
        this.animId = null;
        this.lastTime = performance.now();

        // Bind events
        this.setupInputHandlers();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Start render loop
        this.loop = this.loop.bind(this);
        this.animId = requestAnimationFrame(this.loop);
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = rect.width;
        this.height = Math.min(rect.width * 0.72, Math.max(400, window.innerHeight * 0.58));

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (this.challenge) {
            this.updateEntityPositions();
        }
    }

    getSpeedForTier(tier) {
        // Calibrated bullet velocity tiers (scaled by screen sizeFactor)
        const sizeFactor = Math.min(this.width, Math.max(450, this.height * 1.6)) / 1000;
        const baseSpeed = Math.max(0.85, Math.min(1.25, sizeFactor));
        const tierMultipliers = {
            1: 8.0,   // Slow Plasma
            2: 11.0,  // Medium Kinetic
            3: 14.0,  // Standard Laser (from Spaceship Flight)
            4: 17.5,  // Hyper-Velocity Beam
            5: 21.0   // Tachyon Railgun
        };
        return (tierMultipliers[tier] || 14.0) * baseSpeed;
    }

    getTierName(tier) {
        const names = {
            1: 'Tier 1: Slow Plasma',
            2: 'Tier 2: Light Kinetic',
            3: 'Tier 3: Standard Laser',
            4: 'Tier 4: Hyper-Beam',
            5: 'Tier 5: Tachyon Railgun'
        };
        return names[tier] || `Tier ${tier}`;
    }

    /**
     * Load an asteroid challenge for the current round
     */
    loadChallenge(challenge) {
        this.challenge = challenge;
        this.bulletSpeedTier = challenge.bulletTier || 3;
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

        // Fixed ship position
        this.shipX = ch.shipX * W;
        this.shipY = ch.shipY * H;

        // Create the Rock instance using SpaceshipCore.Rock
        const RockClass = this.core.Rock;
        if (!RockClass) return;

        this.rock = new RockClass(W, H, ch.speed);
        this.rock.shapeIndex = ch.shapeIndex % 5;

        // Apply challenge baseRadius if specified
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

        // Spawn position along perimeter
        const offset = 20;
        let startX, startY;
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
        const moveAngle = Math.atan2(targetY - startY, targetX - startX);
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

        // Default ship aim facing the asteroid's predicted position
        const defaultAim = Math.atan2(this.rockClipEndState.y - this.shipY, this.rockClipEndState.x - this.shipX);
        this.shipAngle = Math.round(((defaultAim * 180 / Math.PI) + 90 + 360) % 360);
        this.targetAngle = this.shipAngle;
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

    /**
     * User adjusts aiming angle
     */
    setAngle(deg) {
        this.shipAngle = Math.round((deg % 360 + 360) % 360);
        this.targetAngle = this.shipAngle;
        this.updateAimUI();
    }

    adjustAngle(deltaDeg) {
        this.setAngle(this.shipAngle + deltaDeg);
    }

    aimAtPoint(px, py) {
        const rad = Math.atan2(py - this.shipY, px - this.shipX);
        const deg = (rad * 180 / Math.PI) + 90;
        this.setAngle(deg);
    }

    /**
     * Test-fire a tracer bullet (does not count as real shot)
     */
    testFire() {
        if (this.state === 'FIRING') return;
        const rad = ((this.shipAngle - 90) * Math.PI) / 180;
        const noseDist = 22;
        const bx = this.shipX + Math.cos(rad) * noseDist;
        const by = this.shipY + Math.sin(rad) * noseDist;
        const speed = this.getSpeedForTier(this.bulletTier || this.bulletSpeedTier);

        const tracer = {
            x: bx,
            y: by,
            dx: Math.cos(rad) * speed,
            dy: Math.sin(rad) * speed,
            radius: 3.5,
            visualRadius: 6.0,
            isTracer: true,
            distanceTraveled: 0
        };

        this.testBullets.push(tracer);
        if (this.soundFx && typeof this.soundFx.playLaser === 'function') {
            this.soundFx.playLaser();
        }
    }

    /**
     * Commit the real interception shot!
     */
    fireInterceptShot() {
        if (this.state !== 'AIMING' && this.state !== 'PREVIEW') return;

        // Ensure rock is placed at the t = 1.0s clip end position
        this.restoreRockState(this.rockClipEndState);
        this.state = 'FIRING';
        this.isPlayingClip = false;

        const rad = ((this.shipAngle - 90) * Math.PI) / 180;
        const noseDist = 24;
        const bx = this.shipX + Math.cos(rad) * noseDist;
        const by = this.shipY + Math.sin(rad) * noseDist;
        const speed = this.getSpeedForTier(this.bulletSpeedTier);

        const BulletClass = this.core.Bullet;
        if (BulletClass) {
            this.interceptBullet = new BulletClass(bx, by, this.shipAngle, 0, 0);
            this.interceptBullet.dx = Math.cos(rad) * speed;
            this.interceptBullet.dy = Math.sin(rad) * speed;
        } else {
            this.interceptBullet = {
                x: bx,
                y: by,
                dx: Math.cos(rad) * speed,
                dy: Math.sin(rad) * speed,
                radius: 3.5,
                visualRadius: 6.0,
                hit: false
            };
        }

        this.closestDistance = Infinity;
        this.minSurfaceDistance = Infinity;
        this.directHit = false;

        if (this.soundFx && typeof this.soundFx.playLaser === 'function') {
            this.soundFx.playLaser();
        }
    }

    /**
     * Setup keyboard and canvas touch/mouse listeners
     */
    setupInputHandlers() {
        let isPointerDown = false;

        const handlePointer = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX) - rect.left;
            const py = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY) - rect.top;
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

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.adjustAngle(-1);
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.adjustAngle(1);
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
    }

    updateAimUI() {
        const degElem = document.getElementById('telemetry-angle-val');
        if (degElem) degElem.textContent = `${this.shipAngle}°`;
        const dial = document.getElementById('angle-dial-input');
        if (dial && dial.value != this.shipAngle) dial.value = this.shipAngle;
    }

    /**
     * Main animation loop
     */
    loop(timestamp) {
        const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        this.animId = requestAnimationFrame(this.loop);
    }

    update(dt) {
        // Particle system update
        if (this.particles && typeof this.particles.update === 'function') {
            this.particles.update();
        }

        // Test tracer bullets
        for (let i = this.testBullets.length - 1; i >= 0; i--) {
            const b = this.testBullets[i];
            b.x += b.dx;
            b.y += b.dy;
            b.distanceTraveled += Math.hypot(b.dx, b.dy);
            if (b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) {
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
            b.x += b.dx;
            b.y += b.dy;

            // Move rock forward in lockstep
            this.rock.x += this.rock.dx;
            this.rock.y += this.rock.dy;
            this.rock.rotation += this.rock.rotSpeed;

            // Collision check using SpaceshipCore.Rock.containsBullet
            let hit = false;
            if (typeof this.rock.containsBullet === 'function') {
                hit = this.rock.containsBullet(b);
            } else {
                const d = Math.hypot(b.x - this.rock.x, b.y - this.rock.y);
                hit = d <= this.rock.radius;
            }

            // Continuous distance calculation: test against actual polygon edge segments
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
                this.resolveRound(true);
                return;
            }

            // Check if bullet exited arena
            const margin = 50;
            if (b.x < -margin || b.x > this.width + margin || b.y < -margin || b.y > this.height + margin) {
                this.resolveRound(false);
            }
        }
    }

    /**
     * Resolve the round and calculate normalized score
     */
    resolveRound(isDirectHit) {
        this.state = 'RESOLVED';

        const R = this.rock ? this.rock.radius : 25;
        let score = 0;

        if (isDirectHit) {
            score = 100;
            if (this.rock) this.rock.popped = true;
            if (this.soundFx && typeof this.soundFx.playExplosion === 'function') {
                this.soundFx.playExplosion();
            }
            if (this.particles && typeof this.particles.createExplosion === 'function') {
                this.particles.createExplosion(this.interceptBullet.x, this.interceptBullet.y, 45, '#f59e0b');
            }
            this.resultTelemetry = {
                score: 100,
                isHit: true,
                message: "🎯 DIRECT HIT! (100 PTS)",
                subtext: "Perfect ballistic lead solution."
            };
        } else {
            // Normalized Surface Proximity:
            // Miss ratio M = surfaceDistance / asteroidRadius
            const M = this.minSurfaceDistance / R;
            // Formula: round(100 * (1 - M / 3)^1.5)
            if (M <= 3.0) {
                score = Math.max(0, Math.round(100 * Math.pow(1 - (M / 3.0), 1.5)));
            } else {
                score = 0;
            }

            // Calculate lead error in degrees relative to optimal intercept
            const optimalRad = Math.atan2(this.rock.y - this.shipY, this.rock.x - this.shipX);
            const optimalDeg = ((optimalRad * 180 / Math.PI) + 90 + 360) % 360;
            let angleDiff = Math.abs(this.shipAngle - optimalDeg);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;

            this.resultTelemetry = {
                score,
                isHit: false,
                message: score > 75 ? "⚡ GRAZING NEAR-MISS!" : score > 40 ? "⚠️ CLOSE SHAVE" : "❌ BALLISTIC DEFLECTION",
                subtext: `Missed by ${M.toFixed(2)}x rock radii (Error: ~${angleDiff.toFixed(1)}°)`
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

        ctx.clearRect(0, 0, W, H);

        // 1. Radar telemetry background
        this.renderRadarGrid(ctx, W, H);

        // 2. Asteroid
        if (this.rock && !this.rock.popped) {
            // Draw ghost trail during aiming
            if (this.state === 'AIMING' && this.rockInitialState) {
                ctx.save();
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(this.rockInitialState.x, this.rockInitialState.y);
                ctx.lineTo(this.rock.x, this.rock.y);
                ctx.stroke();

                // Small initial ghost marker
                ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
                ctx.beginPath();
                ctx.arc(this.rockInitialState.x, this.rockInitialState.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            this.rock.draw(ctx);
        }

        // 3. Particles
        if (this.particles && typeof this.particles.draw === 'function') {
            this.particles.draw(ctx);
        }

        // 4. Tracer bullets
        for (const b of this.testBullets) {
            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.visualRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 5. Intercept bullet
        if (this.interceptBullet && !this.interceptBullet.hit) {
            if (typeof this.interceptBullet.draw === 'function') {
                this.interceptBullet.draw(ctx);
            } else {
                ctx.save();
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(this.interceptBullet.x, this.interceptBullet.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // 6. Player Spaceship
        this.renderShip(ctx);

        // 7. Aiming reticle and trajectory line
        if (this.state === 'AIMING' || this.state === 'PREVIEW') {
            this.renderAimGuide(ctx);
        }

        // 8. On-screen clip progress bar
        if (this.state === 'PREVIEW') {
            this.renderClipOverlay(ctx, W, H);
        }
    }

    renderRadarGrid(ctx, W, H) {
        ctx.save();
        // Concentric rings
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
        ctx.lineWidth = 1;
        const cx = W / 2;
        const cy = H / 2;
        const maxR = Math.hypot(W, H) / 2;
        for (let r = 80; r < maxR; r += 80) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Axis lines
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
        ctx.stroke();
        ctx.restore();
    }

    renderShip(ctx) {
        ctx.save();
        ctx.translate(this.shipX, this.shipY);
        ctx.rotate((this.shipAngle * Math.PI) / 180);

        // Standard Spaceship Geometry (classic retro arrowhead from Spaceship.java)
        const scale = 1.0;
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#0f172a';
        ctx.lineWidth = 2.0;

        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(0, -22 * scale);       // Nose
        ctx.lineTo(14 * scale, 16 * scale); // Right fin
        ctx.lineTo(8 * scale, 12 * scale);  // Right notch
        ctx.lineTo(0, 15 * scale);          // Thruster
        ctx.lineTo(-8 * scale, 12 * scale); // Left notch
        ctx.lineTo(-14 * scale, 16 * scale);// Left fin
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Glowing cockpit
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -4 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderAimGuide(ctx) {
        ctx.save();
        const rad = ((this.shipAngle - 90) * Math.PI) / 180;
        const noseDist = 24;
        const startX = this.shipX + Math.cos(rad) * noseDist;
        const startY = this.shipY + Math.sin(rad) * noseDist;
        const maxLen = 1200;

        // Faint laser sight line
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(rad) * maxLen, startY + Math.sin(rad) * maxLen);
        ctx.stroke();

        // Lead indicator marker
        const leadDist = 180;
        const reticleX = startX + Math.cos(rad) * leadDist;
        const reticleY = startY + Math.sin(rad) * leadDist;

        ctx.setLineDash([]);
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(reticleX, reticleY, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(reticleX - 12, reticleY);
        ctx.lineTo(reticleX + 12, reticleY);
        ctx.moveTo(reticleX, reticleY - 12);
        ctx.lineTo(reticleX, reticleY + 12);
        ctx.stroke();

        ctx.restore();
    }

    renderClipOverlay(ctx, W, H) {
        ctx.save();
        const progress = Math.min(1.0, this.clipFrame / this.clipDurationFrames);
        const barW = W * 0.6;
        const barH = 4;
        const barX = (W - barW) / 2;
        const barY = 20;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RECON PREVIEW: ${(progress * 1.0).toFixed(2)}s / 1.00s`, W / 2, barY + 18);
        ctx.restore();
    }
}
