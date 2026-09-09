/**
 * ==============================================================================
 * SPACESHIP FLIGHT - MODERN HTML5 / CANVAS GAME ENGINE
 * Original 2016 Game by Amit Joshi (@amitjoshi2724)
 * Ported & Modernized in 2026 for Browser & GitHub Pages Playability
 * ==============================================================================
 */

(() => {
  'use strict';

  // ============================================================================
  // AUDIO SYNTHESIZER (Web Audio API - Pure procedural, zero external files)
  // ============================================================================
  class SoundFX {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this.thrustOsc = null;
      this.thrustGain = null;
      this.isThrustingSound = false;
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playLaser() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    }

    playEmptyBattery() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) { }
    }

    playShieldSound() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);
        osc.frequency.linearRampToValueAtTime(330, now + 0.45);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      } catch (e) { }
    }

    startThrust() {
      if (!this.enabled || this.isThrustingSound) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustGain = this.ctx.createGain();

        this.thrustOsc.type = 'triangle';
        this.thrustOsc.frequency.setValueAtTime(65, now);

        this.thrustGain.gain.setValueAtTime(0.01, now);
        this.thrustGain.gain.linearRampToValueAtTime(0.12, now + 0.1);

        this.thrustOsc.connect(this.thrustGain);
        this.thrustGain.connect(this.ctx.destination);

        this.thrustOsc.start(now);
        this.isThrustingSound = true;
      } catch (e) { }
    }

    stopThrust() {
      if (!this.isThrustingSound || !this.ctx || !this.thrustGain) return;
      try {
        const now = this.ctx.currentTime;
        this.thrustGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        if (this.thrustOsc) {
          this.thrustOsc.stop(now + 0.1);
        }
      } catch (e) { }
      this.isThrustingSound = false;
    }

    playExplosion(isShip = false) {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const duration = isShip ? 0.6 : 0.35;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isShip ? 400 : 700, now);
        filter.frequency.linearRampToValueAtTime(80, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isShip ? 0.4 : 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
      } catch (e) { }
    }

    playGameOver() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [330, 293, 261, 196];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0.2, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.22);
      });
    }
  }

  // ============================================================================
  // STARFIELD BACKGROUND
  // ============================================================================
  class Starfield {
    constructor(canvas) {
      this.canvas = canvas;
      this.stars = [];
      this.init();
    }

    init() {
      this.stars = [];
      const count = Math.floor((this.canvas.width * this.canvas.height) / 8000);
      for (let i = 0; i < Math.max(80, count); i++) {
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 1.8 : 2.5,
          speed: 0.1 + Math.random() * 0.35,
          alpha: 0.3 + Math.random() * 0.7,
          twinkleSpeed: 0.02 + Math.random() * 0.04
        });
      }
    }

    resize() {
      this.init();
    }

    update(shipDx, shipDy) {
      for (const star of this.stars) {
        star.x -= shipDx * star.speed * 0.2;
        star.y -= shipDy * star.speed * 0.2;

        if (star.x < 0) star.x = this.canvas.width;
        if (star.x > this.canvas.width) star.x = 0;
        if (star.y < 0) star.y = this.canvas.height;
        if (star.y > this.canvas.height) star.y = 0;

        star.alpha += star.twinkleSpeed;
        if (star.alpha > 1 || star.alpha < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }
      }
    }

    draw(ctx, showStars = true) {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (!showStars) return;

      for (const star of this.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, star.alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ============================================================================
  // PARTICLE SYSTEM (Thruster fire & explosions)
  // ============================================================================
  class ParticleSystem {
    constructor() {
      this.particles = [];
    }

    addExhaust(x, y, angle, shipDx, shipDy) {
      const rad = ((angle + 90) * Math.PI) / 180;
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 2.5;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        dx: Math.cos(rad + spread) * speed + shipDx * 0.4,
        dy: Math.sin(rad + spread) * speed + shipDy * 0.4,
        size: 3.5 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#f97316' : '#facc15',
        life: 1.0,
        decay: 0.05 + Math.random() * 0.04
      });
    }

    addExplosion(x, y, color = '#facc15', count = 22) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5.5;
        this.particles.push({
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          color: i % 2 === 0 ? color : '#f87171',
          life: 1.0,
          decay: 0.02 + Math.random() * 0.03
        });
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life -= p.decay;
        p.size *= 0.96;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      ctx.save();
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    clear() {
      this.particles = [];
    }
  }

  // ============================================================================
  // BULLET CLASS
  // Matches Bullet.java from Android and Swing implementations
  // ============================================================================
  class Bullet {
    constructor(x, y, angle, shipDx, shipDy) {
      this.x = x;
      this.y = y;
      this.radius = 3;
      this.hit = false;

      // In Android Bullet: angle is in degrees; moves along ship vector
      const rad = ((angle - 90) * Math.PI) / 180;
      const speed = 14;
      this.dx = Math.cos(rad) * speed + shipDx * 0.25;
      this.dy = Math.sin(rad) * speed + shipDy * 0.25;
    }

    update(canvasWidth, canvasHeight) {
      this.x += this.dx;
      this.y += this.dy;

      // Strict off-screen despawn to eliminate memory overhead
      if (
        this.x < -10 ||
        this.x > canvasWidth + 10 ||
        this.y < -10 ||
        this.y > canvasHeight + 10
      ) {
        this.hit = true;
      }
    }

    draw(ctx) {
      if (this.hit) return;
      ctx.save();

      // Outer glow & radiant aura (yellow)
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Solid vibrant yellow core (removed test blue dot)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ============================================================================
  // ROCK (ASTEROID) CLASS
  // Features 5 distinct polygon shapes, accurate ray-cast collision & auto-cleanup
  // ============================================================================
  class Rock {
    constructor(canvasWidth, canvasHeight, speedMultiplier = 1.0) {
      this.popped = false;

      // Responsive scale based on screen dimension (pro game dev formula)
      // On standard 1920x1080, baseUnit is ~1080. On mobile screen, baseUnit is ~450.
      const baseDimension = Math.min(canvasWidth, Math.max(450, canvasHeight * 1.6));
      const sizeFactor = baseDimension / 1000;

      this.radius = (18 + Math.random() * 18) * sizeFactor;
      this.scale = (this.radius / 25);
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.04;
      this.hasEntered = false;
      this.age = 0;

      // Spawn location from screen perimeter
      const side = Math.random();
      const maxSpeed = (1.2 + Math.random() * 1.8) * speedMultiplier * Math.max(0.75, Math.min(1.25, sizeFactor * 1.1));

      // Target a point inside the playable screen to ensure it crosses through
      const targetX = canvasWidth * (0.15 + Math.random() * 0.7);
      const targetY = canvasHeight * (0.15 + Math.random() * 0.7);

      if (side < 0.25) {
        // From left edge
        this.x = -this.radius - 10;
        this.y = Math.random() * canvasHeight;
      } else if (side < 0.5) {
        // From top edge
        this.x = Math.random() * canvasWidth;
        this.y = -this.radius - 10;
      } else if (side < 0.75) {
        // From right edge
        this.x = canvasWidth + this.radius + 10;
        this.y = Math.random() * canvasHeight;
      } else {
        // From bottom edge
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + this.radius + 10;
      }

      // Calculate velocity vector towards target inside the screen
      const angle = Math.atan2(targetY - this.y, targetX - this.x) + (Math.random() - 0.5) * 0.3;
      this.dx = Math.cos(angle) * maxSpeed;
      this.dy = Math.sin(angle) * maxSpeed;

      // 5 Distinct Asteroid Shape Templates:
      // Shape 0: Original 2016 5-point rock from RockMaker.java
      // Shape 1: Jagged 6-point craggy rock
      // Shape 2: Spiky 7-point diamond asteroid
      // Shape 3: Chunky 8-point irregular meteorite
      // Shape 4: Elongated 6-point space boulder
      const shapes = [
        { x: [0, 25, 15, -5, -8], y: [0, 5, 30, 25, 15] },
        { x: [-18, 6, 26, 18, -8, -24], y: [-20, -26, -6, 22, 26, 6] },
        { x: [0, 20, 28, 12, -10, -26, -16], y: [-28, -14, 8, 26, 22, 2, -18] },
        { x: [-14, 10, 26, 20, 8, -14, -28, -20], y: [-24, -22, -4, 16, 28, 24, 6, -12] },
        { x: [-10, 14, 30, 16, -14, -24], y: [-30, -26, 6, 28, 30, -6] }
      ];

      this.shapeIndex = Math.floor(Math.random() * shapes.length);
      const chosen = shapes[this.shapeIndex];

      // Calculate centroid to center points at (0,0)
      let sumX = 0, sumY = 0;
      for (let i = 0; i < chosen.x.length; i++) {
        sumX += chosen.x[i];
        sumY += chosen.y[i];
      }
      const avgX = sumX / chosen.x.length;
      const avgY = sumY / chosen.y.length;

      this.localPoints = [];
      for (let i = 0; i < chosen.x.length; i++) {
        this.localPoints.push({
          x: (chosen.x[i] - avgX) * this.scale * 1.5,
          y: (chosen.y[i] - avgY) * this.scale * 1.5
        });
      }
    }

    getTransformedPoints() {
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      return this.localPoints.map((pt) => ({
        x: this.x + (pt.x * cos - pt.y * sin),
        y: this.y + (pt.x * sin + pt.y * cos)
      }));
    }

    update(canvasWidth, canvasHeight) {
      this.x += this.dx;
      this.y += this.dy;
      this.rotation += this.rotSpeed;
      this.age++;

      // Check if entered screen
      if (!this.hasEntered) {
        if (
          this.x >= -this.radius &&
          this.x <= canvasWidth + this.radius &&
          this.y >= -this.radius &&
          this.y <= canvasHeight + this.radius
        ) {
          this.hasEntered = true;
        }
      }

      // Once it has entered the screen, if it exits the screen edges, clean it up immediately
      const bound = this.radius * 2;
      if (this.hasEntered) {
        if (
          this.x < -bound ||
          this.x > canvasWidth + bound ||
          this.y < -bound ||
          this.y > canvasHeight + bound
        ) {
          return false;
        }
      }

      // Max lifetime safety check (so rocks never linger indefinitely)
      if (this.age > 2400) {
        return false;
      }

      return true;
    }

    draw(ctx) {
      if (this.popped) return;
      const pts = this.getTransformedPoints();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      // Space rock styling - classic light gray (matching Color.LTGRAY / Color.GRAY from 2016)
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Facet detail line
      if (pts.length >= 4) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Shortest distance squared from point (px, py) to line segment (x1, y1) -> (x2, y2)
    distToSegmentSquared(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      if (l2 === 0) return (px - x1) ** 2 + (py - y1) ** 2;

      // Vector projection scalar clamped to segment [0, 1]
      const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      return (px - projX) ** 2 + (py - projY) ** 2;
    }

    // Ray-casting point-in-polygon from Polygon.java (contains method)
    containsPoint(px, py) {
      // Quick radius test first
      const distSq = (px - this.x) ** 2 + (py - this.y) ** 2;
      if (distSq > (this.radius * 1.6) ** 2) return false;

      const pts = this.getTransformedPoints();
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x,
          yi = pts[i].y;
        const xj = pts[j].x,
          yj = pts[j].y;
        const intersect =
          yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }

    // Mathematically exact Circle vs Polygon collision:
    // Returns true if bullet center is inside polygon OR if bullet radius touches any polygon edge
    containsBullet(bullet) {
      const bRadius = bullet.radius || 3;

      // Quick bounding radius cull (including bullet radius threshold)
      const distSq = (bullet.x - this.x) ** 2 + (bullet.y - this.y) ** 2;
      const maxDist = this.radius * 1.6 + bRadius;
      if (distSq > maxDist * maxDist) return false;

      // 1. If bullet center is directly inside the polygon, it's a confirmed hit
      if (this.containsPoint(bullet.x, bullet.y)) {
        return true;
      }

      // 2. Exact Circle vs Edge Distance Test:
      // Checks if the bullet's circular body grazes or touches any polygon segment
      const pts = this.getTransformedPoints();
      const rSq = bRadius * bRadius;

      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const edgeDistSq = this.distToSegmentSquared(
          bullet.x,
          bullet.y,
          pts[j].x,
          pts[j].y,
          pts[i].x,
          pts[i].y
        );
        if (edgeDistSq <= rSq) {
          return true; // Tangential or grazing collision detected!
        }
      }

      return false;
    }
  }

  // ============================================================================
  // SPACESHIP CLASS
  // Matches Spaceship.java and SpaceshipDriver.java
  // ============================================================================
  class Spaceship {
    constructor(canvas, soundFx, particleSystem) {
      this.canvas = canvas;
      this.soundFx = soundFx;
      this.particles = particleSystem;

      this.x = canvas.width / 2;
      this.y = canvas.height / 2;
      this.dx = 0;
      this.dy = 0;
      this.angle = 0; // 0 is facing UP
      this.thrusting = false;
      this.lives = 3;
      this.invincible = false;
      this.unlimitedShield = false;
      this.unlimitedAmmo = false;
      this.energy = 100;
      this.maxEnergy = 100;
      this.shieldEnergy = 100;
      this.maxShieldEnergy = 100;
      this.powerMode = 'shared'; // 'shared', 'dual', 'shield_only'
      this.showStatusBars = false;
      this.scalePercent = parseInt(localStorage.getItem('spaceship_flight_ship_scale') || '100', 10);
      this.recalculateSize();
      this.selectedSkin = 'red'; // 'red' or 'blue'

      this.flameFrame = 0;

      // Load sprite images (including animated moving versions with fire)
      this.sprites = {
        redNormal: new Image(),
        redMoving1: new Image(),
        redMoving2: new Image(),
        blueNormal: new Image(),
        blueMoving: new Image()
      };

      this.sprites.redNormal.src = 'newspaceship.png';
      this.sprites.redMoving1.src = 'newspaceshipmoving.png';
      this.sprites.redMoving2.src = 'newspaceshipmoving2.png';
      this.sprites.blueNormal.src = 'bluenewspaceship.png';
      this.sprites.blueMoving.src = 'bluenewspaceshipmoving2.png';
    }

    recalculateSize() {
      // Adaptive Ship Sizing:
      // Uses the actual playable game arena height (canvas.height) so neither desktop
      // nor tall vertical phones with letterbox padding distort the proportion.
      // Scaled up by 1.3x so the standard (100%) default matches the former 130% size.
      const isPortrait = this.canvas.height < 320;
      const baseRatio = isPortrait ? 0.15 : Math.max(0.08, Math.min(0.106, 44 / Math.max(400, this.canvas.height)));
      const basePx = this.canvas.height * baseRatio;

      const userScale = (this.scalePercent || 100) / 100;
      this.width = Math.round(basePx * userScale);
      this.height = this.width;
    }

    setScalePercent(percent) {
      this.scalePercent = Math.max(70, Math.min(130, percent));
      this.recalculateSize();
      try {
        localStorage.setItem('spaceship_flight_ship_scale', this.scalePercent.toString());
      } catch (e) { }
    }

    reset(full = false) {
      this.x = this.canvas.width / 2;
      this.y = this.canvas.height / 2;
      this.dx = 0;
      this.dy = 0;
      this.angle = 0;
      this.thrusting = false;
      this.invincible = true;
      this.invincibleTimer = 150; // ~2.5 seconds at 60fps
      this.energy = this.maxEnergy;
      this.shieldEnergy = this.maxShieldEnergy;
      if (full) {
        this.lives = 3;
      }
    }

    rotateLeft() {
      this.angle -= 4.5;
    }

    rotateRight() {
      this.angle += 4.5;
    }

    setThrust(active) {
      if (active && !this.thrusting) {
        this.soundFx.startThrust();
      } else if (!active && this.thrusting) {
        this.soundFx.stopThrust();
      }
      this.thrusting = active;
    }

    triggerEmergencyShield() {
      // If ship already has active shield / invincibility (e.g. from respawn or active shield),
      // do NOT activate emergency shield or waste energy!
      if (this.invincible) {
        return false;
      }

      if (this.powerMode === 'dual' || this.powerMode === 'shield_only') {
        // Dedicated shield capacitor: must be 100% charged, no debt allowed
        const SHIELD_COST = 100;
        if (this.shieldEnergy < SHIELD_COST) {
          this.soundFx.playEmptyBattery();
          return false;
        }
        this.shieldEnergy = 0;
      } else {
        // Shared Reactor mode: shield costs 50% energy (strict zero debt, requires >= 50%)
        const SHIELD_COST = 50;
        if (this.energy < SHIELD_COST) {
          this.soundFx.playEmptyBattery();
          return false;
        }
        this.energy -= SHIELD_COST;
      }

      this.invincible = true;
      this.invincibleTimer = 150; // Full 2.5 second shield duration
      this.soundFx.playShieldSound();
      return true;
    }

    fire(bullets) {
      const COST_PER_SHOT = 15;

      // In shield_only mode, ammo is free/unlimited
      if (this.powerMode !== 'shield_only') {
        if (this.energy < COST_PER_SHOT) {
          this.soundFx.playEmptyBattery();
          return false;
        }
        this.energy -= COST_PER_SHOT;
      }

      const rad = ((this.angle - 90) * Math.PI) / 180;
      const noseDist = this.height * 0.55;
      const bx = this.x + Math.cos(rad) * noseDist;
      const by = this.y + Math.sin(rad) * noseDist;

      bullets.push(new Bullet(bx, by, this.angle, this.dx, this.dy));
      this.soundFx.playLaser();
      return true;
    }

    update(dtSeconds = 1 / 60) {
      // Thrust physics matching original Java code
      if (this.thrusting) {
        const rad = ((this.angle - 90) * Math.PI) / 180;
        const accel = 0.24;
        this.dx += Math.cos(rad) * accel;
        this.dy += Math.sin(rad) * accel;

        // Cap maximum speed
        const speed = Math.hypot(this.dx, this.dy);
        const maxSpeed = 10;
        if (speed > maxSpeed) {
          this.dx = (this.dx / speed) * maxSpeed;
          this.dy = (this.dy / speed) * maxSpeed;
        }

        this.flameFrame++;
        // Exhaust particle emission
        const tailRad = ((this.angle + 90) * Math.PI) / 180;
        const tailX = this.x + Math.cos(tailRad) * (this.height * 0.4);
        const tailY = this.y + Math.sin(tailRad) * (this.height * 0.4);
        this.particles.addExhaust(tailX, tailY, this.angle, this.dx, this.dy);
      }

      // Movement & friction damping (matches Android dx *= 0.995)
      this.x += this.dx;
      this.y += this.dy;
      this.dx *= 0.992;
      this.dy *= 0.992;

      // Battery & Shield Recharge Logic:
      // Paused while shield is active (forces post-shield recovery phase)
      if (!this.invincible) {
        // 1. Ammo Battery recharging (for shared and dual modes via Kinetic Dynamo)
        if (this.powerMode === 'shared' || this.powerMode === 'dual') {
          if (this.energy < this.maxEnergy) {
            // Kinetic Dynamo: 12.5%/s idle, accelerating by 1.6x to 20%/s while thrusting
            const energyPerSecond = this.thrusting ? 20 : 12.5;
            const rechargeAmount = energyPerSecond * dtSeconds;
            this.energy = Math.min(this.maxEnergy, this.energy + rechargeAmount);
          }
        }

        // 2. Shield Capacitor recharging (for dual and shield_only modes)
        if (this.powerMode === 'dual') {
          if (this.shieldEnergy < this.maxShieldEnergy) {
            // Dual capacitors shield recharge: 5%/s (20s full charge), no kinetic dynamo speedup
            const shieldRechargeRate = 5;
            this.shieldEnergy = Math.min(this.maxShieldEnergy, this.shieldEnergy + shieldRechargeRate * dtSeconds);
          }
        } else if (this.powerMode === 'shield_only') {
          if (this.shieldEnergy < this.maxShieldEnergy) {
            // Passive shield charger: 2%/s (50s full charge), no kinetic dynamo speedup
            const shieldRechargeRate = 2;
            this.shieldEnergy = Math.min(this.maxShieldEnergy, this.shieldEnergy + shieldRechargeRate * dtSeconds);
          }
        }
      }

      // Screen wrapping
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      if (this.x > this.canvas.width + halfW) this.x = -halfW;
      else if (this.x < -halfW) this.x = this.canvas.width + halfW;
      if (this.y > this.canvas.height + halfH) this.y = -halfH;
      else if (this.y < -halfH) this.y = this.canvas.height + halfH;

      // Invincibility countdown (unless Unlimited Shield is toggled on)
      if (this.unlimitedShield) {
        this.invincible = true;
      } else if (this.invincible) {
        this.invincibleTimer--;
        if (this.invincibleTimer <= 0) {
          this.invincible = false;
        }
      }
    }

    drawRoundedRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    }

    drawStatusBars(ctx) {
      const showAmmo = (this.powerMode === 'shared' || this.powerMode === 'dual');
      const showShield = (this.powerMode === 'dual' || this.powerMode === 'shield_only');

      // Proportional bar sizing hugging tightly next to the spaceship
      const barW = Math.max(3, Math.min(5, Math.round(this.width * 0.075)));
      const barH = Math.max(18, Math.min(30, Math.round(this.height * 0.54)));
      const offsetX = Math.round(this.width * 0.52);
      const topY = Math.round(-barH / 2);
      const radius = 2;

      // 1. AMMO / BATTERY BAR (Screen-left of ship) - Only shown in Shared & Dual modes
      if (showAmmo) {
        const leftX = -offsetX - barW;
        const clampedEnergy = Math.max(0, Math.min(100, this.energy));
        const ammoPct = clampedEnergy / 100;

        // Smooth gradient: Green (135°) at 100% -> Yellow (60°) at 50% -> Orange/Red (0°) at 0%
        const hue = clampedEnergy >= 50
          ? 60 + (clampedEnergy - 50) * 1.5
          : clampedEnergy * 1.2;
        const ammoColor = `hsl(${Math.round(hue)}, 92%, 52%)`;

        // Draw Ammo Track
        ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
        ctx.strokeStyle = `hsla(${Math.round(hue)}, 90%, 55%, 0.45)`;
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, leftX, topY, barW, barH, radius, true, true);

        // Draw Ammo Fill (from bottom up)
        if (ammoPct > 0) {
          const fillH = Math.max(2, Math.round(barH * ammoPct));
          const fillY = topY + barH - fillH;
          ctx.fillStyle = ammoColor;
          if (clampedEnergy < 15 || clampedEnergy > 80) {
            ctx.shadowColor = ammoColor;
            ctx.shadowBlur = 4;
          }
          this.drawRoundedRect(ctx, leftX, fillY, barW, fillH, 1.5, true, false);
          ctx.shadowBlur = 0;
        }
      }

      // 2. SHIELD BAR (Screen-right of ship) - Only shown in Dual & Shield Only modes
      if (showShield) {
        const rightX = offsetX;
        // Directly reflects top HUD shield percentage (0% to 100%)
        const shieldPct = Math.max(0, Math.min(1, this.shieldEnergy / 100));
        const isShieldFull = shieldPct >= 0.99;
        const shieldColor = isShieldFull ? '#00f0ff' : '#38bdf8';

        // Draw Shield Track
        ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
        ctx.strokeStyle = isShieldFull ? 'rgba(0, 240, 255, 0.85)' : 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, rightX, topY, barW, barH, radius, true, true);

        // Draw Shield Fill (from bottom up)
        if (shieldPct > 0) {
          const fillH = Math.max(2, Math.round(barH * shieldPct));
          const fillY = topY + barH - fillH;
          ctx.fillStyle = shieldColor;
          if (isShieldFull) {
            ctx.shadowColor = shieldColor;
            ctx.shadowBlur = 6;
          }
          this.drawRoundedRect(ctx, rightX, fillY, barW, fillH, 1.5, true, false);
          ctx.shadowBlur = 0;
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 1. Invincibility forcefield bubble (Encompasses spaceship AND vertical status bars INSIDE)
      if (this.invincible) {
        ctx.save();
        const bubbleRadius = Math.round(this.width * 0.86);

        // Forcefield aura fill
        ctx.fillStyle = 'rgba(0, 240, 255, 0.13)';
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Glowing outer electric ring
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Faint concentric interior resonance ring
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius * 0.92, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 2. On-Ship Status Bars (drawn screen-vertical INSIDE the shield bubble)
      if (this.showStatusBars) {
        this.drawStatusBars(ctx);
      }

      // 3. Rotate coordinate system for the spaceship sprite and thruster plumes
      ctx.rotate((this.angle * Math.PI) / 180);

      // 4. Select sprite: use moving versions showing fire underneath when gas is pressed
      let sprite;
      if (this.selectedSkin === 'blue') {
        sprite = this.thrusting ? this.sprites.blueMoving : this.sprites.blueNormal;
      } else {
        if (this.thrusting) {
          // Alternate between newspacershipmoving and newspacershipmoving2 for flame jet flicker
          const flicker = Math.floor(this.flameFrame / 5) % 2 === 0;
          sprite = flicker ? this.sprites.redMoving1 : this.sprites.redMoving2;
        } else {
          sprite = this.sprites.redNormal;
        }
      }

      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        // Maintain the ship body size and extend the flame naturally underneath
        const aspect = sprite.naturalHeight / sprite.naturalWidth;
        const renderHeight = this.width * aspect;
        ctx.drawImage(
          sprite,
          -this.width / 2,
          -this.height / 2,
          this.width,
          renderHeight
        );
      } else {
        // Fallback vector ship if image is loading
        ctx.fillStyle = this.selectedSkin === 'blue' ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.lineTo(0, this.height * 0.3);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ============================================================================
  // MAIN GAME CONTROLLER
  // ============================================================================
  class Game {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');

      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('spaceship_flight_high_score') || '0', 10);
      this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
      this.screenShake = 0;

      this.showStars = localStorage.getItem('spaceship_flight_show_stars') !== 'false';
      this.difficulty = localStorage.getItem('spaceship_flight_difficulty') || 'medium';
      this.applyDifficultySettings();

      this.soundFx = new SoundFX();
      this.particles = new ParticleSystem();
      this.starfield = new Starfield(this.canvas);
      this.ship = new Spaceship(this.canvas, this.soundFx, this.particles);

      this.bullets = [];
      this.rocks = [];
      this.rockSpawnTimer = 0;

      // Input State
      this.keys = {
        left: false,
        right: false,
        up: false,
        fire: false
      };

      this.domElements = {
        scoreDisplay: document.getElementById('scoreDisplay'),
        highScoreDisplay: document.getElementById('highScoreDisplay'),
        livesIcons: document.querySelectorAll('.life-icon'),
        pauseBtn: document.getElementById('pauseBtn'),
        soundToggleBtn: document.getElementById('soundToggleBtn'),
        touchControls: document.getElementById('touchControls'),

        energyHud: document.getElementById('energyHud'),
        energyLabel: document.getElementById('energyLabel') || document.querySelector('#energyHud .hud-label'),
        energyVal: document.getElementById('energyVal'),
        energyBarFill: document.getElementById('energyBarFill'),

        shieldHud: document.getElementById('shieldHud'),
        shieldLabel: document.getElementById('shieldLabel') || document.querySelector('#shieldHud .hud-label'),
        shieldVal: document.getElementById('shieldVal'),
        shieldBarFill: document.getElementById('shieldBarFill'),

        // Buttons
        btnLeft: document.getElementById('btnLeft'),
        btnRight: document.getElementById('btnRight'),
        btnThrust: document.getElementById('btnThrust'),
        btnFire: document.getElementById('btnFire'),
        btnEmergencyShield: document.getElementById('btnEmergencyShield'),

        // Modals
        startScreen: document.getElementById('startScreen'),
        pauseModal: document.getElementById('pauseModal'),
        gameOverModal: document.getElementById('gameOverModal'),
        instructionsModal: document.getElementById('instructionsModal'),
        creditsModal: document.getElementById('creditsModal'),
        settingsModal: document.getElementById('settingsModal'),

        // Modal triggers
        playBtn: document.getElementById('playBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        instructionsBtn: document.getElementById('instructionsBtn'),
        creditsBtn: document.getElementById('creditsBtn'),
        resumeBtn: document.getElementById('resumeBtn'),
        restartBtn: document.getElementById('restartBtn'),
        quitBtn: document.getElementById('quitBtn'),
        retryBtn: document.getElementById('retryBtn'),
        gameOverQuitBtn: document.getElementById('gameOverQuitBtn'),
        pauseSettingsBtn: document.getElementById('pauseSettingsBtn'),

        closeInstructionsBtn: document.getElementById('closeInstructionsBtn'),
        closeCreditsBtn: document.getElementById('closeCreditsBtn'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),

        // Settings inputs
        selectRedShip: document.getElementById('selectRedShip'),
        selectBlueShip: document.getElementById('selectBlueShip'),
        settingShipSize: document.getElementById('settingShipSize'),
        shipSizeVal: document.getElementById('shipSizeVal'),
        settingBtnSize: document.getElementById('settingBtnSize'),
        btnSizeVal: document.getElementById('btnSizeVal'),
        settingStars: document.getElementById('settingStars'),
        settingDifficulty: document.getElementById('settingDifficulty'),
        powerModeSelector: document.getElementById('powerModeSelector'),
        settingStatusBars: document.getElementById('settingStatusBars'),
        settingUnlimitedShield: document.getElementById('settingUnlimitedShield'),
        settingSound: document.getElementById('settingSound'),
        settingTouchControls: document.getElementById('settingTouchControls'),
        menuShipPreview: document.getElementById('menuShipPreview'),

        // Results
        finalScoreVal: document.getElementById('finalScoreVal'),
        bestScoreVal: document.getElementById('bestScoreVal'),
        newHighScoreBanner: document.getElementById('newHighScoreBanner')
      };

      let savedPowerMode = localStorage.getItem('spaceship_flight_power_mode');
      if (!savedPowerMode) {
        if (localStorage.getItem('spaceship_flight_unlimited_ammo') === 'true') {
          savedPowerMode = 'shield_only';
        } else {
          savedPowerMode = 'shared';
        }
      }
      this.powerMode = savedPowerMode;
      this.ship.powerMode = this.powerMode;

      this.showStatusBars = localStorage.getItem('spaceship_flight_show_status_bars') === 'true';
      this.ship.showStatusBars = this.showStatusBars;

      this.unlimitedShield = localStorage.getItem('spaceship_flight_unlimited_shield') === 'true';
      this.ship.unlimitedShield = this.unlimitedShield;

      this.btnSize = parseInt(localStorage.getItem('spaceship_flight_btn_size') || '72', 10);
      this.applyBtnSize(this.btnSize);

      this.init();
    }

    applyBtnSize(size) {
      this.btnSize = Math.max(54, Math.min(96, size));
      document.documentElement.style.setProperty('--ctrl-btn-size', `${this.btnSize}px`);
      try {
        localStorage.setItem('spaceship_flight_btn_size', this.btnSize.toString());
      } catch (e) { }
    }

    applyDifficultySettings() {
      if (this.difficulty === 'easy') {
        this.rockSpawnInterval = 110; // ~1.8s
        this.maxRocks = 8;
        this.rockSpeedMultiplier = 1.0;
      } else if (this.difficulty === 'hard') {
        this.rockSpawnInterval = 38;  // ~0.63s
        this.maxRocks = 22;
        this.rockSpeedMultiplier = 1.75;
      } else {
        // medium (standard)
        this.rockSpawnInterval = 68;  // ~1.1s
        this.maxRocks = 14;
        this.rockSpeedMultiplier = 1.35;
      }
    }

    setDifficulty(level) {
      this.difficulty = level;
      this.applyDifficultySettings();
      try {
        localStorage.setItem('spaceship_flight_difficulty', level);
      } catch (e) { }
    }

    setPowerMode(mode) {
      this.powerMode = mode;
      this.ship.powerMode = mode;
      if (mode === 'shield_only' || mode === 'dual') {
        if (this.ship.energy < 0) this.ship.energy = 0;
      }
      this.updateEnergyDisplay();
      try {
        localStorage.setItem('spaceship_flight_power_mode', mode);
        localStorage.setItem('spaceship_flight_unlimited_ammo', (mode === 'shield_only').toString());
      } catch (err) { }
    }

    init() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.resizeCanvas(), 100);
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => this.resizeCanvas());
      }

      this.domElements.highScoreDisplay.textContent = this.highScore;
      this.bindInputs();
      this.bindUI();

      // Main Loop with Fixed Timestep Accumulator (Decoupled 60 FPS Physics)
      let lastTime = performance.now();
      let accumulator = 0;
      const FIXED_TIMESTEP = 1000 / 60; // 16.667ms per physics tick (matching original 60Hz physics clock)

      const loop = (currentTime) => {
        let frameTime = currentTime - lastTime;
        lastTime = currentTime;

        // Spiral of death prevention: cap frameTime to at most 100ms (e.g. background tab or major hitch)
        if (frameTime > 100) frameTime = 100;
        if (frameTime < 0) frameTime = 0;

        accumulator += frameTime;

        // Run fixed 60Hz physics updates
        const dtSeconds = FIXED_TIMESTEP / 1000; // Exact seconds per physics step (e.g. 0.016667s)
        while (accumulator >= FIXED_TIMESTEP) {
          this.update(dtSeconds);
          accumulator -= FIXED_TIMESTEP;
        }

        // Render at screen refresh rate
        this.render();

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    resizeCanvas() {
      const screenW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const screenH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

      const isPortrait = screenH > screenW;

      if (isPortrait) {
        // Enforce 16:9 widescreen canvas horizontally with letterbox padding
        const targetW = screenW;
        const targetH = Math.floor(screenW * (9 / 16));
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      } else {
        // Fullscreen widescreen in landscape / desktop
        this.canvas.width = Math.floor(screenW);
        this.canvas.height = Math.floor(screenH);
      }

      if (this.ship) {
        this.ship.recalculateSize();
      }

      if (this.starfield) this.starfield.resize();
    }

    bindInputs() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        if (e.repeat && (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight')) return;

        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.keys.up = true;
          if (this.state === 'PLAYING') this.ship.setThrust(true);
        }
        if (e.code === 'Space' || e.code === 'KeyL') {
          this.keys.fire = true;
          if (this.state === 'PLAYING') this.ship.fire(this.bullets);
        }
        // Emergency Shield activation: Shift, KeyS, KeyE, or ArrowDown
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyS' || e.code === 'KeyE' || e.code === 'ArrowDown') {
          if (this.state === 'PLAYING') {
            this.ship.triggerEmergencyShield();
            this.updateEnergyDisplay();
          }
        }
        if (e.code === 'KeyP' || e.code === 'Escape') {
          this.togglePause();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.keys.up = false;
          if (this.state === 'PLAYING') this.ship.setThrust(false);
        }
        if (e.code === 'Space' || e.code === 'KeyL') this.keys.fire = false;
      });

      // On-screen touch buttons
      const bindTouchBtn = (btn, onDown, onUp) => {
        if (!btn) return;
        const handleDown = (e) => {
          e.preventDefault();
          btn.classList.add('pressed');
          onDown();
        };
        const handleUp = (e) => {
          e.preventDefault();
          btn.classList.remove('pressed');
          onUp();
        };
        btn.addEventListener('pointerdown', handleDown);
        btn.addEventListener('pointerup', handleUp);
        btn.addEventListener('pointercancel', handleUp);
      };

      bindTouchBtn(
        this.domElements.btnLeft,
        () => (this.keys.left = true),
        () => (this.keys.left = false)
      );

      bindTouchBtn(
        this.domElements.btnRight,
        () => (this.keys.right = true),
        () => (this.keys.right = false)
      );

      bindTouchBtn(
        this.domElements.btnEmergencyShield,
        () => {
          if (this.state === 'PLAYING') {
            this.ship.triggerEmergencyShield();
            this.updateEnergyDisplay();
          }
        },
        () => { }
      );

      bindTouchBtn(
        this.domElements.btnThrust,
        () => {
          this.keys.up = true;
          if (this.state === 'PLAYING') this.ship.setThrust(true);
        },
        () => {
          this.keys.up = false;
          if (this.state === 'PLAYING') this.ship.setThrust(false);
        }
      );

      bindTouchBtn(
        this.domElements.btnFire,
        () => {
          if (this.state === 'PLAYING') this.ship.fire(this.bullets);
        },
        () => { }
      );

      // Direct canvas interactions (Tap = fire, Hold = thrust)
      let canvasTouchHold = null;
      this.canvas.addEventListener('pointerdown', (e) => {
        if (this.state !== 'PLAYING') return;
        // If clicking on HUD or touch buttons, skip
        if (e.clientY < 70) return;

        this.soundFx.init();
        this.soundFx.resume();

        canvasTouchHold = setTimeout(() => {
          this.ship.setThrust(true);
        }, 180);
      });

      this.canvas.addEventListener('pointerup', (e) => {
        if (this.state !== 'PLAYING') return;
        if (canvasTouchHold) {
          clearTimeout(canvasTouchHold);
          canvasTouchHold = null;
          // Tap fired
          this.ship.fire(this.bullets);
        }
        this.ship.setThrust(false);
      });

      this.canvas.addEventListener('pointercancel', () => {
        if (canvasTouchHold) clearTimeout(canvasTouchHold);
        this.ship.setThrust(false);
      });
    }

    bindUI() {
      // Menu Navigation
      this.domElements.playBtn.addEventListener('click', () => this.startGame());
      this.domElements.settingsBtn.addEventListener('click', () => this.showModal('settings'));
      this.domElements.instructionsBtn.addEventListener('click', () => this.showModal('instructions'));
      this.domElements.creditsBtn.addEventListener('click', () => this.showModal('credits'));

      // Modals Close
      this.domElements.closeInstructionsBtn.addEventListener('click', () => this.hideModals());
      this.domElements.closeCreditsBtn.addEventListener('click', () => this.hideModals());
      this.domElements.closeSettingsBtn.addEventListener('click', () => this.hideModals());

      // Pause Menu
      this.domElements.pauseBtn.addEventListener('click', () => this.togglePause());
      this.domElements.resumeBtn.addEventListener('click', () => this.resumeGame());
      this.domElements.restartBtn.addEventListener('click', () => this.restartGame());
      this.domElements.pauseSettingsBtn.addEventListener('click', () => this.showModal('settings'));
      this.domElements.quitBtn.addEventListener('click', () => this.quitToMainMenu());

      // Game Over
      this.domElements.retryBtn.addEventListener('click', () => this.startGame());
      this.domElements.gameOverQuitBtn.addEventListener('click', () => this.quitToMainMenu());

      // Sound Toggle
      this.domElements.soundToggleBtn.addEventListener('click', () => {
        this.soundFx.enabled = !this.soundFx.enabled;
        this.domElements.soundToggleBtn.textContent = this.soundFx.enabled ? '🔊' : '🔇';
        this.domElements.settingSound.checked = this.soundFx.enabled;
      });

      this.domElements.settingSound.addEventListener('change', (e) => {
        this.soundFx.enabled = e.target.checked;
        this.domElements.soundToggleBtn.textContent = this.soundFx.enabled ? '🔊' : '🔇';
      });

      // Ship Selection
      const updateShipChoice = (skin) => {
        this.ship.selectedSkin = skin;
        if (skin === 'blue') {
          this.domElements.selectBlueShip.classList.add('active');
          this.domElements.selectRedShip.classList.remove('active');
          this.domElements.menuShipPreview.src = 'bluenewspaceship.png';
        } else {
          this.domElements.selectRedShip.classList.add('active');
          this.domElements.selectBlueShip.classList.remove('active');
          this.domElements.menuShipPreview.src = 'newspaceship.png';
        }
      };

      this.domElements.selectRedShip.addEventListener('click', () => updateShipChoice('red'));
      this.domElements.selectBlueShip.addEventListener('click', () => updateShipChoice('blue'));

      // Ship size slider
      if (this.domElements.settingShipSize) {
        this.domElements.settingShipSize.value = this.ship.scalePercent;
        if (this.domElements.shipSizeVal) {
          this.domElements.shipSizeVal.textContent = `${this.ship.scalePercent}%`;
        }
        this.domElements.settingShipSize.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.ship.setScalePercent(val);
          if (this.domElements.shipSizeVal) {
            this.domElements.shipSizeVal.textContent = `${val}%`;
          }
        });
      }

      // Button size slider
      if (this.domElements.settingBtnSize) {
        this.domElements.settingBtnSize.value = this.btnSize;
        if (this.domElements.btnSizeVal) {
          this.domElements.btnSizeVal.textContent = `${this.btnSize}px`;
        }
        this.domElements.settingBtnSize.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.applyBtnSize(val);
          if (this.domElements.btnSizeVal) {
            this.domElements.btnSizeVal.textContent = `${val}px`;
          }
        });
      }

      // Background stars toggle
      if (this.domElements.settingStars) {
        this.domElements.settingStars.checked = this.showStars;
        this.domElements.settingStars.addEventListener('change', (e) => {
          this.showStars = e.target.checked;
          try {
            localStorage.setItem('spaceship_flight_show_stars', this.showStars.toString());
          } catch (err) { }
        });
      }

      // Difficulty setting
      if (this.domElements.settingDifficulty) {
        this.domElements.settingDifficulty.value = this.difficulty;
        this.domElements.settingDifficulty.addEventListener('change', (e) => {
          this.setDifficulty(e.target.value);
        });
      }

      // Power Mode / Energy System Selector
      if (this.domElements.powerModeSelector) {
        const cards = this.domElements.powerModeSelector.querySelectorAll('.power-mode-card');
        cards.forEach((card) => {
          if (card.dataset.mode === this.powerMode) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }

          card.addEventListener('click', () => {
            cards.forEach((c) => c.classList.remove('active'));
            card.classList.add('active');
            this.setPowerMode(card.dataset.mode);
          });
        });
      }

      // On-ship status bars setting
      if (this.domElements.settingStatusBars) {
        this.domElements.settingStatusBars.checked = this.showStatusBars;
        this.domElements.settingStatusBars.addEventListener('change', (e) => {
          this.showStatusBars = e.target.checked;
          this.ship.showStatusBars = this.showStatusBars;
          try {
            localStorage.setItem('spaceship_flight_show_status_bars', this.showStatusBars.toString());
          } catch (err) { }
        });
      }

      // Unlimited Shield setting
      if (this.domElements.settingUnlimitedShield) {
        this.domElements.settingUnlimitedShield.checked = this.unlimitedShield;
        this.domElements.settingUnlimitedShield.addEventListener('change', (e) => {
          this.unlimitedShield = e.target.checked;
          this.ship.unlimitedShield = this.unlimitedShield;
          if (this.unlimitedShield) {
            this.ship.invincible = true;
          }
          try {
            localStorage.setItem('spaceship_flight_unlimited_shield', this.unlimitedShield.toString());
          } catch (err) { }
        });
      }

      // Touch controls visibility setting
      this.domElements.settingTouchControls.addEventListener('change', (e) => {
        const val = e.target.value;
        this.domElements.touchControls.classList.remove('hidden', 'auto-hide');
        if (val === 'hidden') {
          this.domElements.touchControls.classList.add('hidden');
        } else if (val === 'auto') {
          this.domElements.touchControls.classList.add('auto-hide');
        }
      });
    }

    showModal(modalName) {
      this.hideModals();
      if (modalName === 'settings') {
        this.domElements.settingsModal.classList.add('active');
        if (this.domElements.settingStatusBars) {
          this.domElements.settingStatusBars.checked = this.showStatusBars;
        }
        if (this.domElements.powerModeSelector) {
          const cards = this.domElements.powerModeSelector.querySelectorAll('.power-mode-card');
          cards.forEach((c) => {
            if (c.dataset.mode === this.powerMode) {
              c.classList.add('active');
            } else {
              c.classList.remove('active');
            }
          });
        }
      }
      if (modalName === 'instructions') this.domElements.instructionsModal.classList.add('active');
      if (modalName === 'credits') this.domElements.creditsModal.classList.add('active');
      if (modalName === 'pause') this.domElements.pauseModal.classList.add('active');
      if (modalName === 'gameover') this.domElements.gameOverModal.classList.add('active');
    }

    hideModals() {
      this.domElements.settingsModal.classList.remove('active');
      this.domElements.instructionsModal.classList.remove('active');
      this.domElements.creditsModal.classList.remove('active');
      this.domElements.pauseModal.classList.remove('active');
      this.domElements.gameOverModal.classList.remove('active');
      if (this.state === 'START') {
        this.domElements.startScreen.classList.add('active');
      }
    }

    startGame() {
      this.soundFx.init();
      this.soundFx.resume();
      this.hideModals();
      this.domElements.startScreen.classList.remove('active');

      this.score = 0;
      this.updateScore(0);
      this.bullets = [];
      this.rocks = [];
      this.particles.clear();
      this.ship.reset(true);
      this.updateLivesDisplay();
      this.updateEnergyDisplay();

      // Initial rocks spawn based on difficulty
      const initialCount = this.difficulty === 'easy' ? 3 : this.difficulty === 'hard' ? 7 : 5;
      for (let i = 0; i < initialCount; i++) {
        this.rocks.push(new Rock(this.canvas.width, this.canvas.height, this.rockSpeedMultiplier));
      }

      this.state = 'PLAYING';
    }

    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        this.ship.setThrust(false);
        if (this.domElements.pauseBtn) {
          this.domElements.pauseBtn.textContent = '▶';
          this.domElements.pauseBtn.setAttribute('title', 'Resume Game');
          this.domElements.pauseBtn.setAttribute('aria-label', 'Resume Game');
        }
        this.showModal('pause');
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
      }
    }

    resumeGame() {
      this.hideModals();
      this.state = 'PLAYING';
      if (this.domElements.pauseBtn) {
        this.domElements.pauseBtn.textContent = '| |';
        this.domElements.pauseBtn.setAttribute('title', 'Pause Game');
        this.domElements.pauseBtn.setAttribute('aria-label', 'Pause Game');
      }
    }

    restartGame() {
      if (this.domElements.pauseBtn) {
        this.domElements.pauseBtn.textContent = '| |';
        this.domElements.pauseBtn.setAttribute('title', 'Pause Game');
        this.domElements.pauseBtn.setAttribute('aria-label', 'Pause Game');
      }
      this.startGame();
    }

    quitToMainMenu() {
      this.hideModals();
      this.ship.setThrust(false);
      this.state = 'START';
      if (this.domElements.pauseBtn) {
        this.domElements.pauseBtn.textContent = '| |';
        this.domElements.pauseBtn.setAttribute('title', 'Pause Game');
        this.domElements.pauseBtn.setAttribute('aria-label', 'Pause Game');
      }
      this.domElements.startScreen.classList.add('active');
    }

    updateScore(val) {
      this.score = val;
      this.domElements.scoreDisplay.textContent = this.score;

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.domElements.highScoreDisplay.textContent = this.highScore;
        localStorage.setItem('spaceship_flight_high_score', this.highScore.toString());
      }
    }

    updateLivesDisplay() {
      this.domElements.livesIcons.forEach((icon, idx) => {
        const poly = icon.querySelector('polygon');
        if (idx < this.ship.lives) {
          icon.classList.add('active');
          if (poly) poly.setAttribute('fill', '#00f0ff');
        } else {
          icon.classList.remove('active');
          if (poly) poly.setAttribute('fill', '#334155');
        }
      });
    }

    applyCombatSiphon() {
      if (this.powerMode === 'shared') {
        // Shared Reactor: +6% to shared battery per rock destroyed
        this.ship.energy = Math.min(this.ship.maxEnergy, this.ship.energy + 6);
      } else if (this.powerMode === 'dual') {
        // Dual Capacitors: +3% to ammo battery AND +3% to shield capacitor
        this.ship.energy = Math.min(this.ship.maxEnergy, this.ship.energy + 3);
        this.ship.shieldEnergy = Math.min(this.ship.maxShieldEnergy, this.ship.shieldEnergy + 3);
      } else if (this.powerMode === 'shield_only') {
        // Shield Charger: +3% to shield capacitor (ammo is unlimited)
        this.ship.shieldEnergy = Math.min(this.ship.maxShieldEnergy, this.ship.shieldEnergy + 3);
      }
      this.updateEnergyDisplay();
    }

    updateEnergyDisplay() {
      if (!this.domElements.energyHud) return;

      const isDual = this.powerMode === 'dual';
      const isShieldOnly = this.powerMode === 'shield_only';

      // Visibility of primary and secondary HUD gauges
      this.domElements.energyHud.classList.remove('hidden');
      if (this.domElements.shieldHud) {
        if (isDual) {
          this.domElements.shieldHud.classList.remove('hidden');
        } else {
          this.domElements.shieldHud.classList.add('hidden');
        }
      }

      // --- PRIMARY GAUGE (#energyHud) ---
      if (isShieldOnly) {
        // Displays SHIELD in cyan
        const shieldVal = Math.round(this.ship.shieldEnergy);
        const isReady = shieldVal >= 100;
        const fillPct = Math.max(0, Math.min(100, shieldVal));

        if (this.domElements.energyLabel) this.domElements.energyLabel.textContent = 'SHIELD';
        this.domElements.energyHud.classList.add('shield-mode');

        if (this.domElements.energyVal) {
          this.domElements.energyVal.textContent = `${shieldVal}%`;
          this.domElements.energyVal.style.color = '';
          this.domElements.energyVal.style.textShadow = '';
          this.domElements.energyVal.className = 'energy-percent shield-mode' + (isReady ? ' ready' : '');
        }

        const track = this.domElements.energyHud.querySelector('.energy-bar-track');
        if (track) {
          track.style.borderColor = '';
          track.className = 'energy-bar-track shield-mode';
        }

        if (this.domElements.energyBarFill) {
          this.domElements.energyBarFill.style.width = `${fillPct}%`;
          this.domElements.energyBarFill.style.background = '';
          this.domElements.energyBarFill.style.boxShadow = '';
          this.domElements.energyBarFill.className = 'energy-bar-fill shield-mode' + (isReady ? ' ready' : '');
        }

        if (this.domElements.btnEmergencyShield) {
          if (!isReady || this.ship.invincible) {
            this.domElements.btnEmergencyShield.classList.add('uncharged');
            this.domElements.btnEmergencyShield.classList.remove('in-debt');
          } else {
            this.domElements.btnEmergencyShield.classList.remove('uncharged', 'in-debt');
          }
        }
      } else if (isDual) {
        // Displays AMMO with smooth Green -> Yellow -> Red gradient
        const ammoVal = Math.round(this.ship.energy);
        const fillPct = Math.max(0, Math.min(100, ammoVal));
        const hue = fillPct >= 50 ? 60 + (fillPct - 50) * 1.5 : fillPct * 1.2;
        const colorHsl = `hsl(${Math.round(hue)}, 92%, 52%)`;
        const shadowHsl = `hsla(${Math.round(hue)}, 95%, 55%, 0.85)`;

        if (this.domElements.energyLabel) this.domElements.energyLabel.textContent = 'AMMO';
        this.domElements.energyHud.classList.remove('shield-mode');

        if (this.domElements.energyVal) {
          this.domElements.energyVal.textContent = `${ammoVal}%`;
          this.domElements.energyVal.style.color = colorHsl;
          this.domElements.energyVal.style.textShadow = `0 0 8px ${shadowHsl}, 0 2px 4px rgba(0, 0, 0, 0.9)`;
          this.domElements.energyVal.className = 'energy-percent' + (ammoVal < 15 ? ' depleted' : '');
        }

        const track = this.domElements.energyHud.querySelector('.energy-bar-track');
        if (track) {
          track.style.borderColor = `hsla(${Math.round(hue)}, 90%, 55%, 0.55)`;
          track.className = 'energy-bar-track' + (ammoVal < 15 ? ' depleted' : '');
        }

        if (this.domElements.energyBarFill) {
          this.domElements.energyBarFill.style.width = `${fillPct}%`;
          this.domElements.energyBarFill.style.background = `linear-gradient(90deg, hsl(${Math.round(hue)}, 85%, 35%), hsl(${Math.round(hue)}, 90%, 50%), hsl(${Math.round(hue)}, 95%, 60%))`;
          this.domElements.energyBarFill.style.boxShadow = `0 0 10px ${shadowHsl}`;
          this.domElements.energyBarFill.className = 'energy-bar-fill' + (ammoVal < 15 ? ' depleted' : '');
        }

        // --- SECONDARY GAUGE (#shieldHud for Dual Mode) ---
        if (this.domElements.shieldHud) {
          const shieldVal = Math.round(this.ship.shieldEnergy);
          const isReady = shieldVal >= 100;
          const shieldFillPct = Math.max(0, Math.min(100, shieldVal));

          if (this.domElements.shieldLabel) this.domElements.shieldLabel.textContent = 'SHIELD';
          if (this.domElements.shieldVal) {
            this.domElements.shieldVal.textContent = `${shieldVal}%`;
            this.domElements.shieldVal.className = 'energy-percent shield-mode' + (isReady ? ' ready' : '');
          }

          const shieldTrack = this.domElements.shieldHud.querySelector('.energy-bar-track');
          if (shieldTrack) shieldTrack.className = 'energy-bar-track shield-mode';

          if (this.domElements.shieldBarFill) {
            this.domElements.shieldBarFill.style.width = `${shieldFillPct}%`;
            this.domElements.shieldBarFill.className = 'energy-bar-fill shield-mode' + (isReady ? ' ready' : '');
          }

          if (this.domElements.btnEmergencyShield) {
            if (!isReady || this.ship.invincible) {
              this.domElements.btnEmergencyShield.classList.add('uncharged');
              this.domElements.btnEmergencyShield.classList.remove('in-debt');
            } else {
              this.domElements.btnEmergencyShield.classList.remove('uncharged', 'in-debt');
            }
          }
        }
      } else {
        // Standard SHARED REACTOR mode: 1 unified battery for weapons & shields
        // Shield costs 50% energy, requiring at least 50% charge (strict zero debt)
        const energyVal = Math.round(this.ship.energy);
        const fillPct = Math.max(0, Math.min(100, energyVal));
        const hue = fillPct >= 50 ? 60 + (fillPct - 50) * 1.5 : fillPct * 1.2;
        const colorHsl = `hsl(${Math.round(hue)}, 92%, 52%)`;
        const shadowHsl = `hsla(${Math.round(hue)}, 95%, 55%, 0.85)`;

        if (this.domElements.energyLabel) this.domElements.energyLabel.textContent = 'ENERGY';
        this.domElements.energyHud.classList.remove('shield-mode');

        if (this.domElements.energyVal) {
          this.domElements.energyVal.textContent = `${energyVal}%`;
          this.domElements.energyVal.style.color = colorHsl;
          this.domElements.energyVal.style.textShadow = `0 0 8px ${shadowHsl}, 0 2px 4px rgba(0, 0, 0, 0.9)`;
          this.domElements.energyVal.className = 'energy-percent' + (energyVal < 15 ? ' depleted' : '');
        }

        const track = this.domElements.energyHud.querySelector('.energy-bar-track');
        if (track) {
          track.style.borderColor = `hsla(${Math.round(hue)}, 90%, 55%, 0.55)`;
          track.className = 'energy-bar-track' + (energyVal < 15 ? ' depleted' : '');
        }

        if (this.domElements.energyBarFill) {
          this.domElements.energyBarFill.style.width = `${fillPct}%`;
          this.domElements.energyBarFill.style.background = `linear-gradient(90deg, hsl(${Math.round(hue)}, 85%, 35%), hsl(${Math.round(hue)}, 90%, 50%), hsl(${Math.round(hue)}, 95%, 60%))`;
          this.domElements.energyBarFill.style.boxShadow = `0 0 10px ${shadowHsl}`;
          this.domElements.energyBarFill.className = 'energy-bar-fill' + (energyVal < 15 ? ' depleted' : '');
        }

        if (this.domElements.btnEmergencyShield) {
          if (this.ship.energy < 50 || this.ship.invincible) {
            this.domElements.btnEmergencyShield.classList.add('uncharged');
            this.domElements.btnEmergencyShield.classList.remove('in-debt');
          } else {
            this.domElements.btnEmergencyShield.classList.remove('in-debt', 'uncharged');
          }
        }
      }
    }

    handlePlayerHit() {
      this.soundFx.playExplosion(true);
      this.screenShake = 16;
      this.particles.addExplosion(this.ship.x, this.ship.y, '#f43f5e', 35);

      this.ship.lives--;
      this.updateLivesDisplay();

      if (this.ship.lives <= 0) {
        this.gameOver();
      } else {
        this.ship.reset(false);
        this.ship.energy = this.ship.maxEnergy; // Guarantee fresh 100% on respawn
        this.ship.shieldEnergy = this.ship.maxShieldEnergy; // Guarantee fresh 100% on respawn
        this.updateEnergyDisplay();
      }
    }

    gameOver() {
      this.state = 'GAMEOVER';
      this.soundFx.stopThrust();
      this.soundFx.playGameOver();

      this.domElements.finalScoreVal.textContent = this.score;
      this.domElements.bestScoreVal.textContent = this.highScore;

      if (this.score >= this.highScore && this.score > 0) {
        this.domElements.newHighScoreBanner.classList.remove('hidden');
      } else {
        this.domElements.newHighScoreBanner.classList.add('hidden');
      }

      this.showModal('gameover');
    }

    update(dtSeconds = 1 / 60) {
      if (this.screenShake > 0) {
        this.screenShake *= 0.9;
        if (this.screenShake < 0.5) this.screenShake = 0;
      }

      if (this.state === 'PLAYING') {
        // Continuous keyboard rotation
        if (this.keys.left) this.ship.rotateLeft();
        if (this.keys.right) this.ship.rotateRight();

        // Ship update (movement, thrust, kinetic battery recharge with dynamic dt)
        this.ship.update(dtSeconds);
        this.updateEnergyDisplay();

        // Asteroid Spawning based on difficulty limits
        this.rockSpawnTimer++;
        if (this.rockSpawnTimer > this.rockSpawnInterval) {
          this.rockSpawnTimer = 0;
          if (this.rocks.length < this.maxRocks) {
            this.rocks.push(new Rock(this.canvas.width, this.canvas.height, this.rockSpeedMultiplier));
          }
        }

        // Bullets update & Rock collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
          const b = this.bullets[i];
          b.update(this.canvas.width, this.canvas.height);

          if (b.hit) {
            this.bullets.splice(i, 1);
            continue;
          }

          // Check bullet against rocks
          for (let j = this.rocks.length - 1; j >= 0; j--) {
            const r = this.rocks[j];
            if (!r.popped && r.containsBullet(b)) {
              r.popped = true;
              b.hit = true;

              this.soundFx.playExplosion(false);
              this.particles.addExplosion(r.x, r.y, '#38bdf8', 20);
              this.updateScore(this.score + 1);
              this.applyCombatSiphon();

              this.rocks.splice(j, 1);
              break;
            }
          }
        }

        // Rocks update & Ship collision
        for (let j = this.rocks.length - 1; j >= 0; j--) {
          const r = this.rocks[j];
          const alive = r.update(this.canvas.width, this.canvas.height);
          if (!alive) {
            this.rocks.splice(j, 1);
            continue;
          }

          // Check collision with ship
          if (!this.ship.invincible && !r.popped && r.containsPoint(this.ship.x, this.ship.y)) {
            r.popped = true;
            this.rocks.splice(j, 1);
            this.handlePlayerHit();
            break;
          }
        }
      }

      // Starfield parallax & particles update
      this.starfield.update(
        this.state === 'PLAYING' ? this.ship.dx : 0.2,
        this.state === 'PLAYING' ? this.ship.dy : 0
      );
      this.particles.update();
    }

    render() {
      this.ctx.save();

      // Screen shake effect
      if (this.screenShake > 0) {
        const sx = (Math.random() - 0.5) * this.screenShake;
        const sy = (Math.random() - 0.5) * this.screenShake;
        this.ctx.translate(sx, sy);
      }

      // Clear & draw background
      this.starfield.draw(this.ctx, this.showStars);

      // Draw game items
      this.particles.draw(this.ctx);

      for (const rock of this.rocks) {
        rock.draw(this.ctx);
      }

      for (const bullet of this.bullets) {
        bullet.draw(this.ctx);
      }

      if (this.state === 'PLAYING' || this.state === 'PAUSED') {
        this.ship.draw(this.ctx);
      }

      this.ctx.restore();
    }
  }

  // Launch on DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();

    // Register Service Worker for bulletproof offline play
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            console.log('Spaceship Flight Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.log('Service Worker registration failed:', err);
          });
      });
    }
  });
})();
