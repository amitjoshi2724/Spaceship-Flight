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

    stopThrust(immediate = false) {
      if (!this.ctx) {
        this.isThrustingSound = false;
        return;
      }
      try {
        const now = this.ctx.currentTime;
        if (this.thrustGain) {
          if (immediate) {
            this.thrustGain.gain.cancelScheduledValues(now);
            this.thrustGain.gain.setValueAtTime(0.0001, now);
          } else {
            this.thrustGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
          }
        }
        if (this.thrustOsc) {
          try {
            this.thrustOsc.stop(immediate ? now : now + 0.1);
          } catch (_) { }
        }
      } catch (e) { }
      this.thrustOsc = null;
      this.thrustGain = null;
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

    playRockExplosion() {
      this.playExplosion(false);
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

    playUFOWarning() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.6);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(8, now); // 8Hz vibrato
        lfoGain.gain.setValueAtTime(45, now);
        lfo.connect(osc.frequency);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.65);
        lfo.stop(now + 0.65);
      } catch (e) { }
    }

    playUFOLaser() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.15);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) { }
    }

    playUFOExplosion() {
      if (!this.enabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const duration = 0.55;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(90, now + duration);
        filter.Q.setValueAtTime(2.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.3);
        oscGain.gain.setValueAtTime(0.12, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch (e) { }
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
  // RESPONSIVE SCREEN METRIC HELPER
  // Dynamically scales physical and visual dimensions across phones, tablets, and 4K displays
  // ============================================================================
  function getScreenScale(canvas) {
    if (!canvas) return 1.0;
    const baseDimension = Math.min(canvas.width, Math.max(450, canvas.height * 1.6));
    return Math.max(0.6, Math.min(2.0, baseDimension / 1000));
  }

  // ============================================================================
  // BULLET CLASS
  // Matches Bullet.java from Android and Swing implementations
  // ============================================================================
  class Bullet {
    constructor(x, y, angle, shipDx, shipDy, sizeFactor = 1.0) {
      this.x = x;
      this.y = y;
      this.sizeFactor = sizeFactor;

      // Dynamic responsive scaling: never hardcode pixel sizes
      this.coreRadius = 3.0 * sizeFactor;
      this.visualRadius = 5.5 * sizeFactor; // Outer glowing plasma envelope
      this.collisionRadius = this.visualRadius; // Physical hitbox matches rendered plasma envelope
      this.radius = this.coreRadius;
      this.hit = false;

      // In Android Bullet: angle is in degrees; moves along ship vector
      const rad = ((angle - 90) * Math.PI) / 180;
      const speed = 14 * Math.max(0.85, Math.min(1.25, sizeFactor));
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
      ctx.arc(this.x, this.y, this.visualRadius, 0, Math.PI * 2);
      ctx.fill();

      // Solid vibrant yellow core
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ============================================================================
  // ROCK (ASTEROID) CLASS
  // Features 5 distinct polygon shapes, accurate ray-cast collision & auto-cleanup
  // ============================================================================
  class Rock {
    constructor(canvasWidth, canvasHeight, speedMultiplier = 1.0, spawnOffset = 10) {
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

      // Spawn location from screen perimeter with custom offset distance
      const side = Math.random();
      const maxSpeed = (1.2 + Math.random() * 1.8) * speedMultiplier * Math.max(0.75, Math.min(1.25, sizeFactor * 1.1));

      // Target a point inside the playable screen to ensure it crosses through
      const targetX = canvasWidth * (0.15 + Math.random() * 0.7);
      const targetY = canvasHeight * (0.15 + Math.random() * 0.7);

      if (side < 0.25) {
        // From left edge
        this.x = -this.radius - spawnOffset;
        this.y = Math.random() * canvasHeight;
      } else if (side < 0.5) {
        // From top edge
        this.x = Math.random() * canvasWidth;
        this.y = -this.radius - spawnOffset;
      } else if (side < 0.75) {
        // From right edge
        this.x = canvasWidth + this.radius + spawnOffset;
        this.y = Math.random() * canvasHeight;
      } else {
        // From bottom edge
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + this.radius + spawnOffset;
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

    // Mathematically exact Continuous Collision Detection (Swept Capsule vs Polygon):
    // Returns true if bullet body touches the polygon, or if swept trajectory crossed/grazed it
    containsBullet(bullet) {
      // Physical hitbox radius queried directly from bullet object (matches rendered outer plasma)
      const bRadius = bullet.collisionRadius || bullet.radius || 3;
      const rSq = bRadius * bRadius;

      const p1x = bullet.x;
      const p1y = bullet.y;
      const p0x = bullet.dx !== undefined ? bullet.x - bullet.dx : p1x;
      const p0y = bullet.dy !== undefined ? bullet.y - bullet.dy : p1y;

      // Broad-phase bounding circle check against the swept segment midpoint & radius
      const midX = (p0x + p1x) * 0.5;
      const midY = (p0y + p1y) * 0.5;
      const distSq = (midX - this.x) ** 2 + (midY - this.y) ** 2;
      const stepLen = Math.hypot(bullet.dx || 0, bullet.dy || 0);
      const maxDist = this.radius * 1.6 + bRadius + stepLen * 0.5;
      if (distSq > maxDist * maxDist) return false;

      // 1. If current position, previous position, or midpoint is inside polygon, it's a confirmed hit
      if (this.containsPoint(p1x, p1y) || this.containsPoint(p0x, p0y) || this.containsPoint(midX, midY)) {
        return true;
      }

      const pts = this.getTransformedPoints();

      // 2. Continuous Collision Detection (CCD):
      // Check if the bullet's travel segment (p0 -> p1) crossed ANY polygon edge in this frame
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        if (this.segmentsIntersect(p0x, p0y, p1x, p1y, pts[j].x, pts[j].y, pts[i].x, pts[i].y)) {
          return true;
        }
      }

      // 3. Exact Circle vs Edge Distance Test:
      // Checks if the bullet's circular body grazes or touches any polygon segment (tested at p1, mid, and p0)
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const x1 = pts[j].x, y1 = pts[j].y;
        const x2 = pts[i].x, y2 = pts[i].y;

        if (
          this.distToSegmentSquared(p1x, p1y, x1, y1, x2, y2) <= rSq ||
          this.distToSegmentSquared(midX, midY, x1, y1, x2, y2) <= rSq ||
          this.distToSegmentSquared(p0x, p0y, x1, y1, x2, y2) <= rSq
        ) {
          return true; // Tangential or grazing collision detected!
        }
      }

      // 4. Asteroid corner graze check:
      // Checks if any asteroid vertex lies within the bullet's swept capsule radius
      for (let i = 0; i < pts.length; i++) {
        if (this.distToSegmentSquared(pts[i].x, pts[i].y, p0x, p0y, p1x, p1y) <= rSq) {
          return true;
        }
      }

      return false;
    }

    // Fast 2D Line Segment vs Line Segment Intersection
    segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(d) < 1e-9) return false; // Parallel or collinear

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;

      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    // Exact Polygon-vs-Polygon Collision between Asteroid and 12-point Spaceship Hull
    collidesWithShip(ship) {
      // 1. Broad-phase bounding radius test
      const distSq = (this.x - ship.x) ** 2 + (this.y - ship.y) ** 2;
      const maxDist = this.radius * 1.6 + ship.width * 0.55;
      if (distSq > maxDist * maxDist) return false;

      // 2. Get transformed world vertices for both rock and ship
      const rockPts = this.getTransformedPoints();
      const shipPts = ship.getTransformedPoints();

      // 3. Exact Edge-to-Edge segment intersection tests (12 ship edges vs rock polygon edges)
      for (let i = 0, j = rockPts.length - 1; i < rockPts.length; j = i++) {
        const rx1 = rockPts[j].x, ry1 = rockPts[j].y;
        const rx2 = rockPts[i].x, ry2 = rockPts[i].y;

        for (let k = 0, m = shipPts.length - 1; k < shipPts.length; m = k++) {
          const sx1 = shipPts[m].x, sy1 = shipPts[m].y;
          const sx2 = shipPts[k].x, sy2 = shipPts[k].y;

          if (this.segmentsIntersect(rx1, ry1, rx2, ry2, sx1, sy1, sx2, sy2)) {
            return true; // Edge crossing detected!
          }
        }
      }

      // 4. Polygon containment tests (handles cases where one polygon is fully inside the other):
      // a) Ship center inside rock (large rock engulfs ship)
      if (this.containsPoint(ship.x, ship.y)) return true;

      // b) Rock center inside ship hull (small rock inside ship body)
      let rockInsideShip = false;
      for (let k = 0, m = shipPts.length - 1; k < shipPts.length; m = k++) {
        const xi = shipPts[k].x, yi = shipPts[k].y;
        const xj = shipPts[m].x, yj = shipPts[m].y;
        const intersect = (yi > this.y !== yj > this.y) &&
          (this.x < ((xj - xi) * (this.y - yi)) / (yj - yi) + xi);
        if (intersect) rockInsideShip = !rockInsideShip;
      }
      if (rockInsideShip) return true;

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

      this.sprites.redNormal.src = 'images/newspaceship.png';
      this.sprites.redMoving1.src = 'images/newspaceshipmoving.png';
      this.sprites.redMoving2.src = 'images/newspaceshipmoving2.png';
      this.sprites.blueNormal.src = 'images/bluenewspaceship.png';
      this.sprites.blueMoving.src = 'images/bluenewspaceshipmoving2.png';
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

    // Exact 12-point hull polygon mirroring newspaceship.png (64x64) pixel boundaries
    // Transformed by ship position (x, y) and rotation angle
    getTransformedPoints() {
      const rad = (this.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const w = this.width;
      const h = this.height;

      // 12-point silhouette coordinates relative to ship center (0, 0)
      const localPts = [
        { x:  0.000 * w, y: -0.484 * h }, // 1. Nose Tip
        { x:  0.219 * w, y: -0.219 * h }, // 2. Right Shoulder (Head-to-body transition)
        { x:  0.219 * w, y: -0.047 * h }, // 3. Right Wing Root
        { x:  0.344 * w, y:  0.203 * h }, // 4. Right Wingtip
        { x:  0.219 * w, y:  0.234 * h }, // 5. Right Wing Inner Notch
        { x:  0.312 * w, y:  0.469 * h }, // 6. Right Tail Fin Tip
        { x:  0.000 * w, y:  0.469 * h }, // 7. Engine Base Center
        { x: -0.312 * w, y:  0.469 * h }, // 8. Left Tail Fin Tip
        { x: -0.219 * w, y:  0.234 * h }, // 9. Left Wing Inner Notch
        { x: -0.344 * w, y:  0.203 * h }, // 10. Left Wingtip
        { x: -0.219 * w, y: -0.047 * h }, // 11. Left Wing Root
        { x: -0.219 * w, y: -0.219 * h }  // 12. Left Shoulder (Head-to-body transition)
      ];

      return localPts.map((pt) => ({
        x: this.x + (pt.x * cos - pt.y * sin),
        y: this.y + (pt.x * sin + pt.y * cos)
      }));
    }

    containsPoint(px, py) {
      const pts = this.getTransformedPoints();
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, yi = pts[i].y;
        const xj = pts[j].x, yj = pts[j].y;
        const intersect = (yi > py !== yj > py) &&
          (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    containsBullet(bullet) {
      const bRadius = bullet.collisionRadius || bullet.radius || 3.5;
      const rSq = bRadius * bRadius;

      const p1x = bullet.x;
      const p1y = bullet.y;
      const p0x = bullet.dx !== undefined ? bullet.x - bullet.dx : p1x;
      const p0y = bullet.dy !== undefined ? bullet.y - bullet.dy : p1y;
      const midX = (p0x + p1x) * 0.5;
      const midY = (p0y + p1y) * 0.5;

      const distSq = (this.x - midX) ** 2 + (this.y - midY) ** 2;
      const maxR = this.width * 0.55;
      const stepLen = Math.hypot(bullet.dx || 0, bullet.dy || 0);
      if (distSq > (maxR + bRadius + stepLen * 0.5) ** 2) return false;

      if (this.containsPoint(p1x, p1y) || this.containsPoint(p0x, p0y) || this.containsPoint(midX, midY)) return true;

      const pts = this.getTransformedPoints();
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const x1 = pts[j].x, y1 = pts[j].y;
        const x2 = pts[i].x, y2 = pts[i].y;
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;

        for (const [px, py] of [[p1x, p1y], [midX, midY], [p0x, p0y]]) {
          let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t * dx;
          const projY = y1 + t * dy;
          if ((px - projX) ** 2 + (py - projY) ** 2 <= rSq) return true;
        }
      }
      return false;
    }

    reset(full = false) {
      this.x = this.canvas.width / 2;
      this.y = this.canvas.height / 2;
      this.dx = 0;
      this.dy = 0;
      this.angle = 0;
      this.thrusting = false;
      this.soundFx.stopThrust(true);
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
      if (active) {
        if (!this.thrusting) {
          this.soundFx.startThrust();
        }
      } else {
        this.soundFx.stopThrust();
      }
      this.thrusting = active;
    }

    triggerEmergencyShield() {
      // If ship already has active temporary shield (e.g. from respawn or active shield),
      // do NOT activate emergency shield or waste energy!
      if (this.invincible && !this.unlimitedShield) {
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

      // In shield_only mode or with unlimitedAmmo/unlimitedShield (God Mode), ammo is free
      if (this.powerMode !== 'shield_only' && !this.unlimitedAmmo && !this.unlimitedShield) {
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

      const scale = getScreenScale(this.canvas);
      bullets.push(new Bullet(bx, by, this.angle, this.dx, this.dy, scale));
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
      // Paused while temporary emergency shield is active (forces post-shield recovery phase),
      // but always recharges when Unlimited Shield (God Mode) is enabled.
      if (!this.invincible || this.unlimitedShield) {
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

        // Gentle, soft epilepsy-safe shield expiration warning (< ~1.0s / 60 frames remaining)
        // Strictly adheres to WCAG 2.1 (< 3 Hz threshold) with smooth sinusoidal breathing (no harsh strobe or stark contrast cuts)
        let auraAlpha = 0.13;
        let ringAlpha = 1.0;
        let innerRingAlpha = 0.45;

        if (!this.unlimitedShield && this.invincibleTimer <= 60) {
          // Smooth sine pulse at ~1.9 Hz (well below the 3 Hz safety threshold)
          const pulse = 0.5 + 0.5 * Math.sin((60 - this.invincibleTimer) * 0.20);
          auraAlpha = 0.05 + 0.12 * pulse;
          ringAlpha = 0.35 + 0.65 * pulse;
          innerRingAlpha = 0.15 + 0.35 * pulse;
        }

        const ringColor = `rgba(0, 240, 255, ${ringAlpha})`;

        // Forcefield aura fill
        ctx.fillStyle = `rgba(0, 240, 255, ${auraAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Glowing outer electric ring
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = ringAlpha > 0.5 ? 12 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Faint concentric interior resonance ring
        ctx.strokeStyle = `rgba(56, 189, 248, ${innerRingAlpha})`;
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
  // UFO BULLET (Alien Violet Plasma Bolt)
  // ============================================================================
  class UFOBullet {
    constructor(x, y, dx, dy, targetType = 'player', aimMode = 'direct', defensiveColor = 'blue', sizeFactor = 1.0) {
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.sizeFactor = sizeFactor;

      // Dynamic responsive scaling: never hardcode pixel sizes
      this.coreRadius = 3.5 * sizeFactor;
      this.visualRadius = 6.3 * sizeFactor; // Outer plasma body radius (~1.8x core) scaled dynamically
      this.collisionRadius = this.visualRadius; // Physical hitbox strictly matches rendered plasma
      this.radius = this.coreRadius;
      this.hit = false;
      this.targetType = targetType; // 'player' or 'rock'
      this.aimMode = aimMode; // 'direct' or 'predictive'
      this.defensiveColor = defensiveColor; // 'blue' (starboard) or 'red' (port)
      this.trail = [];
    }

    update(canvasWidth, canvasHeight) {
      this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
      if (this.trail.length > 5) this.trail.shift();
      for (const t of this.trail) t.alpha *= 0.72;

      this.x += this.dx;
      this.y += this.dy;

      if (
        this.x < -25 ||
        this.x > canvasWidth + 25 ||
        this.y < -25 ||
        this.y > canvasHeight + 25
      ) {
        this.hit = true;
      }
    }

    draw(ctx) {
      if (this.hit) return;
      ctx.save();

      let glowColor, outerColor, trailColor, coreColor;

      if (this.targetType === 'rock') {
        if (this.defensiveColor === 'red') {
          // Port CIWS bolt: Intense crimson laser (#ff0033 / #ff1744)
          glowColor = '#ff0033';
          outerColor = '#ff1744';
          trailColor = (a) => `rgba(255, 23, 68, ${a * 0.90})`;
          coreColor = '#ffebee';
        } else {
          // Starboard CIWS bolt: Exact photo royal blue from enemyship.png (#1761f2)
          glowColor = '#2563eb';
          outerColor = '#1761f2';
          trailColor = (a) => `rgba(23, 97, 242, ${a * 0.80})`;
          coreColor = '#ffffff';
        }
      } else if (this.aimMode === 'predictive') {
        // Offensive Predictive Lead: Alien Violet / Purple
        glowColor = '#c084fc';
        outerColor = '#e879f9';
        trailColor = (a) => `rgba(192, 132, 252, ${a * 0.45})`;
        coreColor = '#fdf4ff';
      } else {
        // Offensive Direct Shot: Emerald Green
        glowColor = '#00ff8e';
        outerColor = '#00ff9d';
        trailColor = (a) => `rgba(0, 255, 142, ${a * 0.45})`;
        coreColor = '#f0fdf4';
      }

      // Plasma trail
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        ctx.fillStyle = trailColor(t.alpha);
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.coreRadius * (0.6 + (i / this.trail.length) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // Radiant outer glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = outerColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.visualRadius, 0, Math.PI * 2);
      ctx.fill();

      // Incandescent bright core
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.coreRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ============================================================================
  // UFO (EVIL SHIP) CLASS
  // Uses enemyship.png with exact 20-point collision polygon & Unified Context Steering
  // ============================================================================
  class UFO {
    constructor(canvas, soundFx, particleSystem, difficulty = 'medium', ship = null, rocks = []) {
      this.canvas = canvas;
      this.soundFx = soundFx;
      this.particles = particleSystem;
      this.difficulty = difficulty;
      this.ship = ship;

      this.sprite = new Image();
      this.sprite.src = 'images/enemyship.png';

      this.recalculateSize();

      /*
      // Smart safe perimeter spawn selection (commented out per user request):
      const candidates = [
        // Left edge (top-left & bottom-left)
        { x: -this.width, y: this.canvas.height * 0.30, dx: this.vCruise, dy: 0.15 * this.vCruise },
        { x: -this.width, y: this.canvas.height * 0.70, dx: this.vCruise, dy: -0.15 * this.vCruise },
        // Right edge (top-right & bottom-right)
        { x: this.canvas.width + this.width, y: this.canvas.height * 0.30, dx: -this.vCruise, dy: 0.15 * this.vCruise },
        { x: this.canvas.width + this.width, y: this.canvas.height * 0.70, dx: -this.vCruise, dy: -0.15 * this.vCruise },
        // Top edge (left flank & right flank, avoiding top-center HUD)
        { x: this.canvas.width * 0.20, y: -this.height, dx: 0.15 * this.vCruise, dy: this.vCruise },
        { x: this.canvas.width * 0.80, y: -this.height, dx: -0.15 * this.vCruise, dy: this.vCruise },
        // Bottom edge (left flank & right flank)
        { x: this.canvas.width * 0.25, y: this.canvas.height + this.height, dx: 0.15 * this.vCruise, dy: -this.vCruise },
        { x: this.canvas.width * 0.75, y: this.canvas.height + this.height, dx: -0.15 * this.vCruise, dy: -this.vCruise }
      ];

      // Shuffle candidates slightly for organic randomness when space is clear
      candidates.sort(() => Math.random() - 0.5);

      let bestCand = candidates[0];
      let maxDistToNearestRock = -1;

      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        let minDist = 99999;
        for (let i = 0; i < rocks.length; i++) {
          const r = rocks[i];
          if (r.popped) continue;
          const d = Math.hypot(r.x - cand.x, r.y - cand.y);
          if (d < minDist) minDist = d;
        }
        if (minDist > maxDistToNearestRock) {
          maxDistToNearestRock = minDist;
          bestCand = cand;
        }
      }

      this.x = bestCand.x;
      this.y = bestCand.y;
      this.dx = bestCand.dx;
      this.dy = bestCand.dy;
      */

      // Classic random perimeter spawn:
      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        // Left
        this.x = -this.width;
        this.y = this.canvas.height * (0.2 + Math.random() * 0.6);
        this.dx = this.vCruise;
        this.dy = (Math.random() - 0.5) * this.vCruise;
      } else if (side === 1) {
        // Right
        this.x = this.canvas.width + this.width;
        this.y = this.canvas.height * (0.2 + Math.random() * 0.6);
        this.dx = -this.vCruise;
        this.dy = (Math.random() - 0.5) * this.vCruise;
      } else if (side === 2) {
        // Top - flank spawns
        const leftZone = Math.random() < 0.5;
        this.x = leftZone
          ? this.canvas.width * (0.08 + Math.random() * 0.22)
          : this.canvas.width * (0.70 + Math.random() * 0.22);
        this.y = -this.height;
        this.dx = (Math.random() - 0.5) * this.vCruise;
        this.dy = this.vCruise;
      } else {
        // Bottom
        this.x = this.canvas.width * (0.2 + Math.random() * 0.6);
        this.y = this.canvas.height + this.height;
        this.dx = (Math.random() - 0.5) * this.vCruise;
        this.dy = -this.vCruise;
      }

      this.drawAngle = 0;
      this.alive = true;
      this.lifetime = 0;
      this.maxLifetime = 1500; // ~25 seconds at 60fps
      this.exiting = false;

      // Spawn Protection / Deflector Shield:
      // Protects the UFO for ~1.3 seconds upon entry so asteroids cannot instantly crush it on arrival
      this.spawnProtectionTimer = 80;

      // Steering State (Unified Algorithm 2)
      this.currentHeadingIndex = 0;
      this.orbitDirection = Math.random() < 0.5 ? 1 : -1;
      this.orbitTimer = 0;
      this.orbitDuration = 300 + Math.random() * 200;
      this.emergencyOverdrive = false;
      this.emergencyAlertTimer = 0;
      this.jinkTimer = 0;
      this.defenseJinkTimer = 0;
      this.telegraphDuration = 22;

      // -------------------------------------------------------------
      // DUAL-CHANNEL WEAPON SYSTEM
      // Channel 1: Offensive Laser Cannon (Player Hunting)
      // Channel 2: Defensive Point-Defense CIWS (Asteroid Survival)
      // -------------------------------------------------------------
      // 1. Offensive Laser Cannon (Deliberate, enjoyable player combat rhythm - tuned to 0.7x frequency)
      this.shootTimer = 0;
      this.shootInterval = difficulty === 'hard' ? 121 : difficulty === 'easy' ? 200 : 157;
      this.telegraphTimer = 0;
      this.nextAimMode = Math.random() < 0.5 ? 'predictive' : 'direct';

      // 2. Defensive Point-Defense CIWS (Dual Port/Starboard interceptors)
      // Arm immediately upon entry so the saucer can vaporize any asteroid in its path on tick 1!
      this.defenseInterval = 45; // Responsive ~0.75s defensive cadence
      this.defenseTimer = this.defenseInterval;
      this.leftDefenseFlashTimer = 0; // Port Red light flash timer
      this.rightDefenseFlashTimer = 0; // Starboard Blue light flash timer
    }

    // Evasive turn agility scales dynamically by difficulty:
    // Easy: 0.30, Medium: 0.40, Hard: 0.50 (cruising remains smooth at 0.10)
    getEvasiveAgility() {
      const agilityTable = {
        easy: 0.30,
        medium: 0.40,
        hard: 0.50,
        expert: 0.60,
        nightmare: 0.70
      };
      return agilityTable[this.difficulty] ?? 0.40;
    }

    // Evasive thruster overdrive boost scales by difficulty:
    // Easy: 1.25x, Medium: 1.40x, Hard: 1.55x (smooth & organic, avoiding unnatural warping)
    getBoostMultiplier() {
      const boostTable = {
        easy: 1.25,
        medium: 1.40,
        hard: 1.55,
        expert: 1.70,
        nightmare: 1.85
      };
      return boostTable[this.difficulty] ?? 1.40;
    }

    recalculateSize() {
      const dScreen = Math.min(this.canvas.width, this.canvas.height);
      const shipScale = (this.ship && this.ship.scalePercent)
        ? this.ship.scalePercent
        : parseInt(localStorage.getItem('spaceship_flight_ship_scale') || '100', 10);

      // UFO scales proportionally with player ship scale (70% - 130%):
      // The maximum large size (dScreen * 0.17, 72px - 144px) serves as the 130% setting.
      // Scaling down proportionally at 100% and 70% ensures neither a smaller nor larger ship
      // has an unfair advantage against enemy targets.
      const scaleFactor = Math.max(70, Math.min(130, shipScale)) / 130;
      const baseMaxW = Math.max(72, Math.min(144, dScreen * 0.17));
      this.width = Math.round(baseMaxW * scaleFactor);
      this.height = this.width;
      this.radius = this.width * 0.463;

      this.vCruise = (0.22 * dScreen) / 60;
      this.vBoost = this.vCruise * this.getBoostMultiplier();
      this.vLaser = (0.85 * dScreen) / 60;
    }

    // Exact 20-point boundary polygon tracing enemyship.png
    getTransformedPoints() {
      const rad = (this.drawAngle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const w = this.width;
      const h = this.height;

      const localPts = [
        // Upper Cockpit Dome
        { x:  0.000 * w, y: -0.250 * h }, // 1. Dome Apex Top
        { x:  0.141 * w, y: -0.244 * h }, // 2. Dome Top Right Slope
        { x:  0.244 * w, y: -0.206 * h }, // 3. Dome Upper-Right Corner
        { x:  0.306 * w, y: -0.141 * h }, // 4. Dome Right Flank
        { x:  0.325 * w, y: -0.031 * h }, // 5. Dome Base / Saucer Transition
        // Lower Saucer Disc
        { x:  0.400 * w, y: +0.016 * h }, // 6. Saucer Upper Flange Right
        { x:  0.463 * w, y: +0.094 * h }, // 7. Saucer Equator Outer Tip Right
        { x:  0.400 * w, y: +0.172 * h }, // 8. Saucer Lower Flange Right
        { x:  0.325 * w, y: +0.206 * h }, // 9. Saucer Bottom Curve Right
        { x:  0.213 * w, y: +0.244 * h }, // 10. Saucer Keel Corner Right
        { x:  0.000 * w, y: +0.250 * h }, // 11. Saucer Keel Center Bottom
        // Mirrored Left Flank
        { x: -0.213 * w, y: +0.244 * h }, // 12. Saucer Keel Corner Left
        { x: -0.325 * w, y: +0.206 * h }, // 13. Saucer Bottom Curve Left
        { x: -0.400 * w, y: +0.172 * h }, // 14. Saucer Lower Flange Left
        { x: -0.463 * w, y: +0.094 * h }, // 15. Saucer Equator Outer Tip Left
        { x: -0.400 * w, y: +0.016 * h }, // 16. Saucer Upper Flange Left
        { x: -0.325 * w, y: -0.031 * h }, // 17. Dome Base / Saucer Transition
        { x: -0.306 * w, y: -0.141 * h }, // 18. Dome Left Flank
        { x: -0.244 * w, y: -0.206 * h }, // 19. Dome Upper-Left Corner
        { x: -0.141 * w, y: -0.244 * h }  // 20. Dome Top Left Slope
      ];

      return localPts.map((pt) => ({
        x: this.x + (pt.x * cos - pt.y * sin),
        y: this.y + (pt.x * sin + pt.y * cos)
      }));
    }

    containsPoint(px, py) {
      const pts = this.getTransformedPoints();
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, yi = pts[i].y;
        const xj = pts[j].x, yj = pts[j].y;
        const intersect = (yi > py !== yj > py) &&
          (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    containsBullet(bullet) {
      const bRadius = bullet.collisionRadius || bullet.radius || 3;
      const rSq = bRadius * bRadius;

      const p1x = bullet.x;
      const p1y = bullet.y;
      const p0x = bullet.dx !== undefined ? bullet.x - bullet.dx : p1x;
      const p0y = bullet.dy !== undefined ? bullet.y - bullet.dy : p1y;
      const midX = (p0x + p1x) * 0.5;
      const midY = (p0y + p1y) * 0.5;

      const distSq = (this.x - midX) ** 2 + (this.y - midY) ** 2;
      const maxR = this.width * 0.55;
      const stepLen = Math.hypot(bullet.dx || 0, bullet.dy || 0);
      if (distSq > (maxR + bRadius + stepLen * 0.5) ** 2) return false;

      if (this.containsPoint(p1x, p1y) || this.containsPoint(p0x, p0y) || this.containsPoint(midX, midY)) return true;

      const pts = this.getTransformedPoints();
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const x1 = pts[j].x, y1 = pts[j].y;
        const x2 = pts[i].x, y2 = pts[i].y;
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;

        for (const [px, py] of [[p1x, p1y], [midX, midY], [p0x, p0y]]) {
          let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t * dx;
          const projY = y1 + t * dy;
          if ((px - projX) ** 2 + (py - projY) ** 2 <= rSq) return true;
        }
      }
      return false;
    }

    collidesWithShip(ship) {
      const distSq = (this.x - ship.x) ** 2 + (this.y - ship.y) ** 2;
      const maxDist = this.width * 0.5 + ship.width * 0.5;
      if (distSq > maxDist * maxDist) return false;

      const ufoPts = this.getTransformedPoints();
      const shipPts = ship.getTransformedPoints();

      for (let i = 0, j = ufoPts.length - 1; i < ufoPts.length; j = i++) {
        const ux1 = ufoPts[j].x, uy1 = ufoPts[j].y;
        const ux2 = ufoPts[i].x, uy2 = ufoPts[i].y;
        for (let k = 0, m = shipPts.length - 1; k < shipPts.length; m = k++) {
          const sx1 = shipPts[m].x, sy1 = shipPts[m].y;
          const sx2 = shipPts[k].x, sy2 = shipPts[k].y;
          if (this.segmentsIntersect(ux1, uy1, ux2, uy2, sx1, sy1, sx2, sy2)) {
            return true;
          }
        }
      }

      if (this.containsPoint(ship.x, ship.y) || ship.containsPoint(this.x, this.y)) {
        return true;
      }
      return false;
    }

    segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(d) < 0.00001) return false;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    update(player, rocks, ufoBullets) {
      if (!this.alive) return false;
      if (!this.ship && player) {
        this.ship = player;
      }

      this.lifetime++;
      if (this.lifetime > this.maxLifetime) {
        this.exiting = true;
      }

      // Check off-screen despawn if exiting
      if (this.exiting) {
        if (
          this.x < -this.width * 2 ||
          this.x > this.canvas.width + this.width * 2 ||
          this.y < -this.height * 2 ||
          this.y > this.canvas.height + this.height * 2
        ) {
          this.alive = false;
          return false;
        }
      }

      if (this.jinkTimer > 0) this.jinkTimer--;
      if (this.defenseJinkTimer > 0) this.defenseJinkTimer--;
      if (this.emergencyAlertTimer > 0) this.emergencyAlertTimer--;
      if (this.spawnProtectionTimer > 0) this.spawnProtectionTimer--;

      // Orbit direction toggle
      this.orbitTimer++;
      if (this.orbitTimer > this.orbitDuration) {
        this.orbitTimer = 0;
        this.orbitDirection *= -1;
      }

      // -------------------------------------------------------------
      // UNIFIED 16-RAY CONTEXT STEERING (Algorithm 2 - Enhanced Avoidance)
      // -------------------------------------------------------------
      const dScreen = Math.min(this.canvas.width, this.canvas.height);
      const R_radar = Math.max(180, 8.0 * this.radius);

      // 1. Threat assessment for rocks within radar range
      const threats = [];
      this.emergencyOverdrive = false;

      for (let i = 0; i < rocks.length; i++) {
        const rock = rocks[i];
        if (rock.popped) continue;

        const relX = rock.x - this.x;
        const relY = rock.y - this.y;
        const dist = Math.hypot(relX, relY);

        if (dist < R_radar + rock.radius) {
          const relVx = rock.dx - this.dx;
          const relVy = rock.dy - this.dy;
          const vClosing = -(relX * relVx + relY * relVy) / (dist || 1);
          
          // Kinematic time-to-impact urgency (Inverse-Square Law: U = 1 / t_impact^2)
          // Required evasive acceleration scales quadratically with decreasing time (a = 2d / t^2)
          let urgencyKinematic = 0;
          let tImpact = 5.0;
          if (vClosing > 0.05) {
            tImpact = (dist / vClosing) / 60; // in SECONDS!
            urgencyKinematic = 1.0 / Math.max(0.04, tImpact * tImpact);
          }

          // Static spatial proximity urgency (quadratic ramp: close rocks are inherently dangerous)
          const proximityFactor = Math.max(0, 1.0 - dist / (R_radar + rock.radius));
          const urgencyProximity = (proximityFactor * proximityFactor) * 3.5;

          const urgency = Math.max(urgencyKinematic, urgencyProximity);
          const clearance = this.radius + rock.radius + 0.45 * this.radius;

          threats.push({
            rock,
            relX,
            relY,
            dist,
            urgency,
            clearance,
            tImpact,
            vClosing
          });

          // Calibrated emergency detection: only trigger if actually closing on a collision course
          if (vClosing > 0.3 && (tImpact < 0.70 || (dist < clearance * 1.35 && tImpact < 1.1))) {
            this.emergencyOverdrive = true;
            this.emergencyAlertTimer = 18; // Flashes left red warning strobe
          }
        }
      }

      // 2. Tactical Interest Variables
      const pDx = player.x - this.x;
      const pDy = player.y - this.y;
      const pDist = Math.hypot(pDx, pDy) || 1;
      const uPlayerX = pDx / pDist;
      const uPlayerY = pDy / pDist;
      const uPerpX = -uPlayerY;
      const uPerpY = uPlayerX;

      const D_tactical = 0.40 * dScreen;
      const tanhDist = Math.tanh((pDist - D_tactical) / (0.18 * dScreen));

      // Boundary soft cushion
      const margin = 0.12 * dScreen;
      let repelX = 0, repelY = 0;
      if (!this.exiting) {
        if (this.x < margin) repelX += (margin - this.x) / margin;
        if (this.x > this.canvas.width - margin) repelX -= (this.x - (this.canvas.width - margin)) / margin;
        if (this.y < margin) repelY += (margin - this.y) / margin;
        if (this.y > this.canvas.height - margin) repelY -= (this.y - (this.canvas.height - margin)) / margin;
      }

      // Directional inertia vector (anti-jitter)
      const currentSpeed = Math.hypot(this.dx, this.dy);
      let vNormX = 1, vNormY = 0;
      if (currentSpeed > 0.1) {
        vNormX = this.dx / currentSpeed;
        vNormY = this.dy / currentSpeed;
      } else {
        const rad = (this.drawAngle * Math.PI) / 180;
        vNormX = Math.cos(rad);
        vNormY = Math.sin(rad);
      }

      // 3. Evaluate 16 Candidate Rays
      const N = 16;
      const rayScores = [];
      const dangerScores = [];

      for (let k = 0; k < N; k++) {
        const angle = (k * 2 * Math.PI) / N;
        const dkX = Math.cos(angle);
        const dkY = Math.sin(angle);

        // Danger Score D(k)
        let rayDanger = 0;
        for (let t = 0; t < threats.length; t++) {
          const threat = threats[t];
          
          // 1. Static Raycast Penetration (forward half-space obstacles)
          const proj = threat.relX * dkX + threat.relY * dkY;
          if (proj > -this.radius * 0.4 && proj < R_radar) {
            const closestDist = Math.hypot(threat.relX - proj * dkX, threat.relY - proj * dkY);
            if (closestDist < threat.clearance) {
              const penetration = 1.0 - closestDist / threat.clearance;
              // Distance weight: obstacles closer along the ray are significantly more urgent
              const distanceWeight = Math.max(0.2, 1.0 - Math.max(0, proj) / R_radar);
              rayDanger += threat.urgency * (penetration * penetration) * distanceWeight * 2.5;
            }
          }

          // 2. Dynamic Trajectory / Velocity-Obstacle Collision Check:
          // Prevents trying to "outrun" a fast rock along its approach corridor!
          // If the rock is closing and UFO flies along ray dk with speed vBoost:
          if (threat.vClosing > 0.1) {
            const ufoVx = dkX * this.vBoost;
            const ufoVy = dkY * this.vBoost;
            const relVx = threat.rock.dx - ufoVx;
            const relVy = threat.rock.dy - ufoVy;
            const vRelSq = relVx * relVx + relVy * relVy;

            // Is the rock closing on the UFO along this candidate trajectory?
            const relDot = threat.relX * relVx + threat.relY * relVy;
            if (relDot < 0 && vRelSq > 1e-4) {
              const tCloseFrames = -relDot / vRelSq;
              if (tCloseFrames > 0 && tCloseFrames < 75) { // within 1.25 seconds
                const closestDistSq = (threat.relX + relVx * tCloseFrames) ** 2 + (threat.relY + relVy * tCloseFrames) ** 2;
                const clearSq = threat.clearance * threat.clearance;
                if (closestDistSq < clearSq) {
                  const dMin = Math.sqrt(closestDistSq);
                  const pen = 1.0 - dMin / threat.clearance;
                  rayDanger += threat.urgency * (pen * pen) * 4.0;
                }
              }
            }
          }
        }
        dangerScores[k] = rayDanger;
      }

      // -------------------------------------------------------------
      // IMMINENT THREAT OVERRIDE:
      // An imminent asteroid threat unconditionally outweighs any attraction/repulsion to the ship.
      // If any rock is on a collision course or in the danger bubble, player combat drives are 100% extinguished.
      // -------------------------------------------------------------
      const hasImminentThreat = threats.some(t =>
        t.vClosing > 0.3 && (t.urgency > 1.8 || (t.dist < t.clearance * 1.5 && t.tImpact < 1.0))
      );
      const currentHeadingDanger = dangerScores[this.currentHeadingIndex] || 0;
      const isFacingDanger = hasImminentThreat || currentHeadingDanger > 0.12;

      // Pure evasion: 0% player attraction, 0% flanking, 0% forward inertia when an asteroid is near!
      const wPlayer = isFacingDanger ? 0.0 : 0.8;
      const wFlank = isFacingDanger ? 0.0 : 0.6;
      const inertiaWeight = isFacingDanger ? 0.0 : 0.7;

      for (let k = 0; k < N; k++) {
        const angle = (k * 2 * Math.PI) / N;
        const dkX = Math.cos(angle);
        const dkY = Math.sin(angle);
        const rayDanger = dangerScores[k];

        // Tactical Interest I(k)
        const I_player = tanhDist * (dkX * uPlayerX + dkY * uPlayerY);
        const I_flank = this.orbitDirection * (dkX * uPerpX + dkY * uPerpY);
        const I_boundary = (dkX * repelX + dkY * repelY);
        const I_inertia = (dkX * vNormX + dkY * vNormY);

        const I_k = wPlayer * I_player + wFlank * I_flank + 1.6 * I_boundary + inertiaWeight * I_inertia;

        // Imminent asteroid threat completely outweighs attraction:
        // Any ray with danger receives an absolute barrier penalty (-100.0) so that
        // completely clear rays (rayDanger === 0) will unconditionally beat rays heading into rocks!
        let totalScore = I_k;
        if (rayDanger > 0) {
          totalScore = -100.0 - (rayDanger * 25.0);
        }

        rayScores.push({ index: k, dkX, dkY, score: totalScore, danger: rayDanger });
      }

      // 4. Heading selection with Responsive Hysteresis
      let best = rayScores[0];
      for (let k = 1; k < N; k++) {
        if (rayScores[k].score > best.score) {
          best = rayScores[k];
        }
      }

      const currentRay = rayScores[this.currentHeadingIndex] || rayScores[0];
      if (best.index !== this.currentHeadingIndex) {
        // Zero stubbornness if danger exists on current path or if alternative is safer!
        const hasDangerAhead = currentRay.danger > 0.001;
        const saferAlternative = best.danger < currentRay.danger;
        const significantlyBetter = best.score > currentRay.score + 0.15;

        if (hasDangerAhead || saferAlternative || significantlyBetter) {
          this.currentHeadingIndex = best.index;
        }
      }

      const chosenRay = rayScores[this.currentHeadingIndex];

      // 5. Physical Velocity Steering (Scaled Agility & Active Retro-Braking)
      const isEvasive = this.emergencyOverdrive || (isFacingDanger && chosenRay.danger > 0.05) || currentRay.danger > 0.12;
      let targetSpeed = isEvasive ? this.vBoost : this.vCruise;

      // Active Retro-Braking / Momentum Cancellation:
      // Decisively dump old momentum so the UFO jerks onto the new heading without sliding
      const dotChosenVel = (chosenRay.dkX * this.dx + chosenRay.dkY * this.dy) / (currentSpeed || 1);
      const isReversing = dotChosenVel < -0.15;
      const isBoxedIn = chosenRay.danger > 0.25;

      if (isBoxedIn) {
        // Trapped with hazards on all sides: cut speed immediately to minimize collision energy
        targetSpeed = 0;
        this.dx *= 0.70;
        this.dy *= 0.70;
      } else if (isReversing) {
        // Aggressive counter-thrust to cancel old diagonal drift before accelerating into the reverse vector
        this.dx *= 0.60;
        this.dy *= 0.60;
      }

      const targetDx = chosenRay.dkX * targetSpeed;
      const targetDy = chosenRay.dkY * targetSpeed;

      // Turn agility scales dynamically by difficulty:
      // Easy: 0.30, Medium: 0.40, Hard: 0.50 (cruising remains 0.10)
      const turnAgility = isEvasive ? this.getEvasiveAgility() : 0.10;
      this.dx += (targetDx - this.dx) * turnAgility;
      this.dy += (targetDy - this.dy) * turnAgility;

      this.x += this.dx;
      this.y += this.dy;

      // Subtle banking tilt (-15 deg to +15 deg)
      const targetBank = Math.max(-15, Math.min(15, this.dx * 3.5));
      this.drawAngle += (targetBank - this.drawAngle) * 0.12;

      // Soft boundary clamp if not exiting
      if (!this.exiting) {
        if (this.x < this.radius) { this.x = this.radius; this.dx = Math.abs(this.dx) * 0.8; }
        if (this.x > this.canvas.width - this.radius) { this.x = this.canvas.width - this.radius; this.dx = -Math.abs(this.dx) * 0.8; }
        if (this.y < this.radius) { this.y = this.radius; this.dy = Math.abs(this.dy) * 0.8; }
        if (this.y > this.canvas.height - this.radius) { this.y = this.canvas.height - this.radius; this.dy = -Math.abs(this.dy) * 0.8; }
      }

      // -------------------------------------------------------------
      // DUAL-CHANNEL WEAPON SYSTEM
      // Channel 1: Defensive Point-Defense (CIWS)
      // Channel 2: Offensive Laser Cannon (Player Hunting)
      // -------------------------------------------------------------

      // -------------------------------------------------------------
      // CHANNEL 1: DEFENSIVE POINT-DEFENSE (CIWS)
      // Dual-Sided CIWS: Port (Red) on Left Flank, Starboard (Blue) on Right Flank
      // Reliably destroys imminent closing asteroids before they crush the saucer!
      // -------------------------------------------------------------
      this.defenseTimer++;
      if (this.leftDefenseFlashTimer > 0) this.leftDefenseFlashTimer--;
      if (this.rightDefenseFlashTimer > 0) this.rightDefenseFlashTimer--;

      let emergencyRock = null;
      let lowestDist = 180;

      for (let t = 0; t < threats.length; t++) {
        const th = threats[t];
        // Closing towards UFO and within interception range (~160px)
        const isClosing = th.vClosing > 0.15;
        const isWithinRange = th.dist < Math.max(160, th.clearance * 2.2);
        const isDangerous = th.tImpact < 1.30 || th.dist < th.clearance * 1.8;

        if (isClosing && isWithinRange && isDangerous && th.dist < lowestDist) {
          lowestDist = th.dist;
          emergencyRock = th;
        }
      }

      if (emergencyRock && this.defenseTimer >= this.defenseInterval) {
        this.defenseTimer = 0;
        // Lead the incoming asteroid by bullet travel time
        const bulletFlightTime = emergencyRock.dist / this.vLaser;
        const leadX = emergencyRock.relX + emergencyRock.rock.dx * bulletFlightTime;
        const leadY = emergencyRock.relY + emergencyRock.rock.dy * bulletFlightTime;
        const aimDist = Math.hypot(leadX, leadY) || 1;
        const bVx = (leadX / aimDist) * this.vLaser;
        const bVy = (leadY / aimDist) * this.vLaser;

        const rad = (this.drawAngle * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);

        // Project lead vector into local saucer coordinate frame:
        // localX < 0 => Threat is on the saucer's LEFT (Port) flank -> Red defensive shot & Red light
        // localX >= 0 => Threat is on the saucer's RIGHT (Starboard) flank -> Blue defensive shot & Blue light
        const localX = leadX * cosA + leadY * sinA;
        const isPort = localX < 0;

        const bulletScale = getScreenScale(this.canvas);
        let muzzleX, muzzleY;
        if (isPort) {
          // Left (Port) Red emitter & light flash
          muzzleX = this.x + (-0.2656 * this.width * cosA - 0.1094 * this.height * sinA);
          muzzleY = this.y + (-0.2656 * this.width * sinA + 0.1094 * this.height * cosA);
          ufoBullets.push(new UFOBullet(muzzleX, muzzleY, bVx, bVy, 'rock', 'direct', 'red', bulletScale));
          this.leftDefenseFlashTimer = 22;
        } else {
          // Right (Starboard) Blue emitter & light flash
          muzzleX = this.x + (0.2656 * this.width * cosA - 0.1094 * this.height * sinA);
          muzzleY = this.y + (0.2656 * this.width * sinA + 0.1094 * this.height * cosA);
          ufoBullets.push(new UFOBullet(muzzleX, muzzleY, bVx, bVy, 'rock', 'direct', 'blue', bulletScale));
          this.rightDefenseFlashTimer = 22;
        }

        this.soundFx.playUFOLaser();
        // Trigger defensive jink
        this.jinkTimer = 18;
      }

      // -------------------------------------------------------------
      // CHANNEL 2: OFFENSIVE LASER CANNON (Player Hunting)
      // Deliberate combat cadence with telegraph glow & Gaussian near-miss spread
      // -------------------------------------------------------------
      this.shootTimer++;
      const telegraphDuration = this.telegraphDuration || 22;

      // When telegraph begins, lock in the targeting mode so the center light telegraphs it!
      if (this.shootTimer === this.shootInterval - telegraphDuration) {
        this.nextAimMode = Math.random() < 0.5 ? 'predictive' : 'direct';
      }

      if (this.shootTimer >= this.shootInterval - telegraphDuration) {
        this.telegraphTimer = this.shootInterval - this.shootTimer;
      } else {
        this.telegraphTimer = 0;
      }

      if (this.shootTimer >= this.shootInterval) {
        this.shootTimer = 0;
        this.telegraphTimer = 0;

        // Predictive or direct lead based on telegraphed nextAimMode
        let aimX = pDx;
        let aimY = pDy;
        if (this.nextAimMode === 'predictive') {
          const timeToHit = pDist / this.vLaser;
          aimX += player.dx * timeToHit;
          aimY += player.dy * timeToHit;
        }

        // Box-Muller Gaussian angular dispersion for organic near-miss thrills
        const sigmaDeg = this.difficulty === 'hard' ? 4.5 : this.difficulty === 'easy' ? 11.5 : 7.5;
        const sigmaRad = (sigmaDeg * Math.PI) / 180;
        const u1 = Math.max(1e-6, Math.random());
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const angleOffset = Math.max(-2.2 * sigmaRad, Math.min(2.2 * sigmaRad, z0 * sigmaRad));

        const aimAngle = Math.atan2(aimY, aimX) + angleOffset;
        const bVx = Math.cos(aimAngle) * this.vLaser;
        const bVy = Math.sin(aimAngle) * this.vLaser;

        const rad = (this.drawAngle * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const centerMuzzleX = this.x + (0.0156 * this.width * cosA - 0.1406 * this.height * sinA);
        const centerMuzzleY = this.y + (0.0156 * this.width * sinA + 0.1406 * this.height * cosA);

        const bulletScale = getScreenScale(this.canvas);
        ufoBullets.push(new UFOBullet(centerMuzzleX, centerMuzzleY, bVx, bVy, 'player', this.nextAimMode, 'blue', bulletScale));
        this.soundFx.playUFOLaser();
        this.jinkTimer = 25;
      }

      return true;
    }

    draw(ctx) {
      if (!this.alive) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.drawAngle * Math.PI) / 180);

      // Draw sprite (enemyship.png)
      if (this.sprite.complete && this.sprite.naturalWidth > 0) {
        // Visual center is at y = 14.0 in 32x32 sprite
        ctx.drawImage(this.sprite, -this.width / 2, -this.height * (14.0 / 32.0), this.width, this.height);
      } else {
        // Fallback saucer vector
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width * 0.46, this.height * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.ellipse(0, -this.height * 0.12, this.width * 0.28, this.height * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // -------------------------------------------------------------
      // DIEGETIC HULL LIGHT SYSTEM (Exact Mathematical Sprite Alignment)
      // On the 32x32 sprite drawn at (-w/2, -h * 14/32):
      //   Left Light:   (-0.2656 * w, 0.1094 * h)
      //   Middle Light: ( 0.0156 * w, 0.1406 * h)
      //   Right Light:  ( 0.2656 * w, 0.1094 * h)
      // -------------------------------------------------------------
      const w = this.width;
      const h = this.height;
      const lightRadius = w * 0.048; // Glowing circular bead matching user's preferred purple size

      // 1 & 3. DANGER HAZARD STROBE (Red and Blue flash TOGETHER on danger!)
      const isEmergency = this.emergencyAlertTimer > 0 || this.emergencyOverdrive;
      let emergencyGlow = 0;
      if (isEmergency) {
        const flashPhase = (this.emergencyAlertTimer > 0)
          ? Math.sin((this.emergencyAlertTimer / 18) * Math.PI * 3)
          : Math.sin(this.lifetime * 0.35);
        emergencyGlow = Math.max(0, flashPhase);
      }

      // 1. LEFT RED LIGHT: Danger Hazard Strobe & Port Defensive CIWS Flash
      const leftX = -0.2656 * w;
      const leftY = 0.1094 * h;
      const leftCiwsPulse = this.leftDefenseFlashTimer > 0 ? (this.leftDefenseFlashTimer / 22) : 0;
      const redGlow = Math.max(emergencyGlow, leftCiwsPulse);

      if (redGlow > 0.05) {
        ctx.save();
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 12 * redGlow;
        ctx.fillStyle = `rgba(255, 23, 68, ${0.95 * redGlow})`;
        ctx.beginPath();
        ctx.arc(leftX, leftY, lightRadius * (0.95 + 0.25 * redGlow), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 240, 240, ${0.98 * redGlow})`;
        ctx.beginPath();
        ctx.arc(leftX, leftY, lightRadius * 0.45 * redGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. MIDDLE LIGHT: Primary Cannon Telegraph (Green = Direct, Purple = Predictive)
      // Exactly one middle light! Both green & purple are identical, circular, and centered!
      const midX = 0.0156 * w;
      const midY = 0.1406 * h;
      if (this.telegraphTimer > 0) {
        const pulse = Math.sin((this.telegraphTimer / (this.telegraphDuration || 22)) * Math.PI);
        const isPredictive = this.nextAimMode === 'predictive';
        const lightColor = isPredictive ? '#c084fc' : '#00ff8e';
        const coreColor = isPredictive ? '#fdf4ff' : '#f0fdf4';

        ctx.save();
        ctx.shadowColor = lightColor;
        ctx.shadowBlur = 12 * pulse;

        // Glowing circular bead (equal size and shape for both green and purple!)
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.arc(midX, midY, lightRadius * (0.95 + 0.25 * pulse), 0, Math.PI * 2);
        ctx.fill();

        // Incandescent center core highlight
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(midX, midY, lightRadius * 0.45 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. RIGHT BLUE LIGHT: Danger Hazard Strobe & Starboard Defensive CIWS Flash
      // Flashes together with red on danger, AND flashes intensely on starboard defensive shots!
      // Uses the exact royal blue from enemyship.png: #1761f2!
      const rightX = 0.2656 * w;
      const rightY = 0.1094 * h;
      const rightCiwsPulse = this.rightDefenseFlashTimer > 0 ? (this.rightDefenseFlashTimer / 22) : 0;
      const blueGlow = Math.max(emergencyGlow, rightCiwsPulse);

      if (blueGlow > 0.05) {
        ctx.save();
        ctx.shadowColor = '#2563eb';
        ctx.shadowBlur = 12 * blueGlow;
        ctx.fillStyle = `rgba(23, 97, 242, ${0.95 * blueGlow})`;
        ctx.beginPath();
        ctx.arc(rightX, rightY, lightRadius * (0.95 + 0.25 * blueGlow), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rightX, rightY, lightRadius * 0.45 * blueGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. DEFLECTOR ENTRY SHIELD (Radiant violet/cyan deflector ring on entry)
      if (this.spawnProtectionTimer > 0) {
        const shieldAlpha = Math.min(1.0, this.spawnProtectionTimer / 25) * (0.65 + 0.35 * Math.sin(this.lifetime * 0.4));
        ctx.save();
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 15 * shieldAlpha;
        ctx.strokeStyle = `rgba(192, 132, 252, ${0.9 * shieldAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(192, 132, 252, ${0.12 * shieldAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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

      this.ufo = null;
      this.ufoBullets = [];
      this.ufoSpawnTimer = 0;

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
        settingUFO: document.getElementById('settingUFO'),
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

      const savedUFO = localStorage.getItem('spaceship_flight_enable_ufo');
      this.enableUFO = savedUFO !== null ? savedUFO === 'true' : true;

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
        this.ufoSpawnInterval = 2200; // ~36s
      } else if (this.difficulty === 'hard') {
        this.rockSpawnInterval = 38;  // ~0.63s
        this.maxRocks = 22;
        this.rockSpeedMultiplier = 1.75;
        this.ufoSpawnInterval = 1400; // ~23s
      } else {
        // medium (standard)
        this.rockSpawnInterval = 68;  // ~1.1s
        this.maxRocks = 14;
        this.rockSpeedMultiplier = 1.35;
        this.ufoSpawnInterval = 1800; // ~30s
      }
    }

    setDifficulty(level) {
      this.difficulty = level;
      this.applyDifficultySettings();
      if (this.ufo) {
        this.ufo.difficulty = level;
        this.ufo.shootInterval = level === 'hard' ? 121 : level === 'easy' ? 200 : 157;
        this.ufo.defenseInterval = level === 'hard' ? 32 : level === 'easy' ? 52 : 40;
        this.ufo.recalculateSize();
      }
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
      if (this.ufo) {
        this.ufo.recalculateSize();
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
        if (e.code === 'KeyU') {
          if (this.state === 'PLAYING') {
            this.spawnUFO();
          }
        }
        if (e.code === 'KeyG') {
          this.unlimitedShield = !this.unlimitedShield;
          this.ship.unlimitedShield = this.unlimitedShield;
          this.ship.invincible = this.unlimitedShield;
          this.ship.unlimitedAmmo = this.unlimitedShield;
          if (this.unlimitedShield) {
            this.ship.energy = this.ship.maxEnergy;
            this.ship.shieldEnergy = this.ship.maxShieldEnergy;
          }
          if (this.domElements.settingUnlimitedShield) {
            this.domElements.settingUnlimitedShield.checked = this.unlimitedShield;
          }
          this.updateEnergyDisplay();
          console.log('God Mode toggled:', this.unlimitedShield);
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
          this.domElements.menuShipPreview.src = 'images/bluenewspaceship.png';
        } else {
          this.domElements.selectRedShip.classList.add('active');
          this.domElements.selectBlueShip.classList.remove('active');
          this.domElements.menuShipPreview.src = 'images/newspaceship.png';
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
          if (this.ufo) {
            this.ufo.recalculateSize();
          }
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

      // Alien UFO / Saucer toggle
      if (this.domElements.settingUFO) {
        this.domElements.settingUFO.checked = this.enableUFO;
        this.domElements.settingUFO.addEventListener('change', (e) => {
          this.enableUFO = e.target.checked;
          if (!this.enableUFO && this.ufo) {
            this.ufo = null;
          }
          try {
            localStorage.setItem('spaceship_flight_enable_ufo', this.enableUFO.toString());
          } catch (err) { }
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

      // Unlimited Shield setting (God Mode)
      if (this.domElements.settingUnlimitedShield) {
        this.domElements.settingUnlimitedShield.checked = this.unlimitedShield;
        this.domElements.settingUnlimitedShield.addEventListener('change', (e) => {
          this.unlimitedShield = e.target.checked;
          this.ship.unlimitedShield = this.unlimitedShield;
          this.ship.unlimitedAmmo = this.unlimitedShield;
          this.ship.invincible = this.unlimitedShield;
          if (this.unlimitedShield) {
            this.ship.energy = this.ship.maxEnergy;
            this.ship.shieldEnergy = this.ship.maxShieldEnergy;
          }
          this.updateEnergyDisplay();
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
      this.soundFx.stopThrust(true);
      this.keys.up = false;
      this.hideModals();
      this.domElements.startScreen.classList.remove('active');

      this.score = 0;
      this.updateScore(0);
      this.bullets = [];
      this.rocks = [];
      this.rockSpawnTimer = -150; // Grace period: ~2.5s before continuous spawning kicks in
      this.ufo = null;
      this.ufoBullets = [];
      this.ufoSpawnTimer = 0;
      this.particles.clear();
      this.ship.reset(true);
      this.updateLivesDisplay();
      this.updateEnergyDisplay();

      // Initial rocks spawn based on difficulty with staggered distances
      // Rather than a sudden wall of 5-7 rocks entering simultaneously,
      // 2-4 rocks glide in progressively, giving a fair and polished opening
      const initialCount = this.difficulty === 'easy' ? 2 : this.difficulty === 'hard' ? 4 : 3;
      for (let i = 0; i < initialCount; i++) {
        const spawnOffset = 15 + i * 90;
        this.rocks.push(new Rock(this.canvas.width, this.canvas.height, this.rockSpeedMultiplier, spawnOffset));
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
      this.ufo = null;
      this.ufoBullets = [];
      this.ufoSpawnTimer = 0;
      this.rocks = [];
      this.rockSpawnTimer = 0;
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

    applyUFOSiphon() {
      if (this.powerMode === 'shared') {
        // Shared Reactor: +10% to shared battery
        this.ship.energy = Math.min(this.ship.maxEnergy, this.ship.energy + 10);
      } else if (this.powerMode === 'dual') {
        // Dual Capacitors: +5% to ammo battery AND +5% to shield capacitor
        this.ship.energy = Math.min(this.ship.maxEnergy, this.ship.energy + 5);
        this.ship.shieldEnergy = Math.min(this.ship.maxShieldEnergy, this.ship.shieldEnergy + 5);
      } else if (this.powerMode === 'shield_only') {
        // Shield Charger: +10% to shield capacitor
        this.ship.shieldEnergy = Math.min(this.ship.maxShieldEnergy, this.ship.shieldEnergy + 10);
      }
      this.updateEnergyDisplay();
    }

    spawnUFO() {
      if (!this.enableUFO) return;
      this.ufo = new UFO(this.canvas, this.soundFx, this.particles, this.difficulty, this.ship, this.rocks);
      this.soundFx.playUFOWarning();
      // Visual warp-in shockwave effect to ensure player notices UFO arrival
      this.particles.addExplosion(this.ufo.x, this.ufo.y, '#c084fc', 22);
      this.particles.addExplosion(this.ufo.x, this.ufo.y, '#38bdf8', 14);
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
          if (!isReady || (this.ship.invincible && !this.ship.unlimitedShield)) {
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
            if (!isReady || (this.ship.invincible && !this.ship.unlimitedShield)) {
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
          if (this.ship.energy < 50 || (this.ship.invincible && !this.ship.unlimitedShield)) {
            this.domElements.btnEmergencyShield.classList.add('uncharged');
            this.domElements.btnEmergencyShield.classList.remove('in-debt');
          } else {
            this.domElements.btnEmergencyShield.classList.remove('in-debt', 'uncharged');
          }
        }
      }
    }

    handlePlayerHit() {
      this.soundFx.stopThrust(true);
      this.ship.setThrust(false);
      this.keys.up = false;
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
      this.soundFx.stopThrust(true);
      this.ship.setThrust(false);
      this.keys.up = false;
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

        // UFO Spawning based on difficulty interval
        if (this.enableUFO && !this.ufo) {
          this.ufoSpawnTimer++;
          if (this.ufoSpawnTimer > this.ufoSpawnInterval) {
            this.ufoSpawnTimer = 0;
            this.spawnUFO();
          }
        }

        // UFO update
        if (this.ufo) {
          const ufoAlive = this.ufo.update(this.ship, this.rocks, this.ufoBullets);
          if (!ufoAlive) {
            this.ufo = null;
          }
        }

        // Bullets update & Rock/UFO collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
          const b = this.bullets[i];
          b.update(this.canvas.width, this.canvas.height);

          if (b.hit) {
            this.bullets.splice(i, 1);
            continue;
          }

          // Check player bullet against UFO
          if (this.ufo && this.ufo.alive && this.ufo.containsBullet(b)) {
            b.hit = true;
            this.bullets.splice(i, 1);
            this.soundFx.playUFOExplosion();
            this.particles.addExplosion(this.ufo.x, this.ufo.y, '#c084fc', 32);
            this.particles.addExplosion(this.ufo.x, this.ufo.y, '#38bdf8', 18);
            this.particles.addExplosion(this.ufo.x, this.ufo.y, '#f43f5e', 12);
            this.updateScore(this.score + 5);
            this.applyUFOSiphon();
            this.ufo = null;
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

        // UFO Bullets update & Player/Rock collisions
        for (let i = this.ufoBullets.length - 1; i >= 0; i--) {
          const ub = this.ufoBullets[i];
          ub.update(this.canvas.width, this.canvas.height);

          if (ub.hit) {
            this.ufoBullets.splice(i, 1);
            continue;
          }

          // UFO bullet hits player ship
          if (this.ship.containsBullet(ub)) {
            ub.hit = true;
            this.ufoBullets.splice(i, 1);
            if (this.ship.invincible) {
              // Shield absorbs laser with cyan deflection flare
              this.particles.addExplosion(ub.x, ub.y, '#38bdf8', 16);
              this.soundFx.playShieldSound();
            } else {
              const hitColor = ub.aimMode === 'predictive' ? '#c084fc' : '#00ff8e';
              this.particles.addExplosion(ub.x, ub.y, hitColor, 18);
              this.handlePlayerHit();
            }
            continue;
          }

          // UFO bullet hits asteroid:
          // Intercepting defensive CIWS or offensive bullets explode the asteroid!
          for (let j = this.rocks.length - 1; j >= 0; j--) {
            const r = this.rocks[j];
            if (!r.popped && r.containsBullet(ub)) {
              ub.hit = true;
              r.popped = true;
              this.soundFx.playExplosion(false);
              let popColor;
              if (ub.targetType === 'rock') {
                popColor = ub.defensiveColor === 'red' ? '#ff1744' : '#1761f2';
              } else {
                popColor = ub.aimMode === 'predictive' ? '#c084fc' : '#00ff8e';
              }
              this.particles.addExplosion(r.x, r.y, popColor, 24);
              this.rocks.splice(j, 1);
              break;
            }
          }

          if (ub.hit) {
            this.ufoBullets.splice(i, 1);
          }
        }

        // Rocks update & Ship/UFO collision
        for (let j = this.rocks.length - 1; j >= 0; j--) {
          const r = this.rocks[j];
          const alive = r.update(this.canvas.width, this.canvas.height);
          if (!alive) {
            this.rocks.splice(j, 1);
            continue;
          }

          // Exact Polygon-vs-Polygon collision with UFO (mutual destruction)
          if (this.ufo && this.ufo.alive && !r.popped && r.collidesWithShip(this.ufo)) {
            if (this.ufo.spawnProtectionTimer > 0) {
              // Spawn deflector shield absorbs and vaporizes the asteroid!
              r.popped = true;
              this.soundFx.playExplosion(false);
              this.particles.addExplosion(r.x, r.y, '#c084fc', 26);
              this.particles.addExplosion(r.x, r.y, '#38bdf8', 18);
              this.rocks.splice(j, 1);
              continue;
            }

            r.popped = true;
            this.soundFx.playUFOExplosion();
            this.particles.addExplosion(this.ufo.x, this.ufo.y, '#c084fc', 30);
            this.particles.addExplosion(r.x, r.y, '#38bdf8', 20);
            this.rocks.splice(j, 1);
            this.ufo = null;
            continue;
          }

          // Exact 12-point Polygon-vs-Polygon collision with ship
          if (!this.ship.invincible && !r.popped && r.collidesWithShip(this.ship)) {
            r.popped = true;
            this.rocks.splice(j, 1);
            this.handlePlayerHit();
            break;
          }
        }

        // Direct UFO vs Player ship hull collision
        if (this.ufo && this.ufo.alive && this.ufo.collidesWithShip(this.ship)) {
          this.soundFx.playUFOExplosion();
          this.particles.addExplosion(this.ufo.x, this.ufo.y, '#c084fc', 35);
          this.ufo = null;
          if (this.ship.invincible) {
            // Shield repels UFO explosion, awards score & siphon
            this.particles.addExplosion(this.ship.x, this.ship.y, '#38bdf8', 22);
            this.updateScore(this.score + 5);
            this.applyUFOSiphon();
          } else {
            this.particles.addExplosion(this.ship.x, this.ship.y, '#ef4444', 25);
            this.handlePlayerHit();
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

      for (const uBullet of this.ufoBullets) {
        uBullet.draw(this.ctx);
      }

      if (this.ufo && this.ufo.alive) {
        this.ufo.draw(this.ctx);
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
