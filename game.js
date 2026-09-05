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
      } catch (e) {}
    }

    stopThrust() {
      if (!this.isThrustingSound || !this.ctx || !this.thrustGain) return;
      try {
        const now = this.ctx.currentTime;
        this.thrustGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        if (this.thrustOsc) {
          this.thrustOsc.stop(now + 0.1);
        }
      } catch (e) {}
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
      } catch (e) {}
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
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
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

      // Despawn when leaving screen
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
  // Preserves 5-point polygon geometry & rayCastIntersect from Polygon.java
  // ============================================================================
  class Rock {
    constructor(canvasWidth, canvasHeight) {
      this.popped = false;
      this.radius = 24 + Math.random() * 18;
      this.scale = this.radius / 25;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;

      // Spawn location from screen perimeter
      const side = Math.random();
      const maxSpeed = 1.2 + Math.random() * 2.2;
      const angleToCenter = Math.random() * Math.PI * 2;

      if (side < 0.25) {
        this.x = -this.radius;
        this.y = Math.random() * canvasHeight;
        this.dx = Math.abs(Math.cos(angleToCenter) * maxSpeed) + 0.5;
        this.dy = Math.sin(angleToCenter) * maxSpeed;
      } else if (side < 0.5) {
        this.x = Math.random() * canvasWidth;
        this.y = -this.radius;
        this.dx = Math.cos(angleToCenter) * maxSpeed;
        this.dy = Math.abs(Math.sin(angleToCenter) * maxSpeed) + 0.5;
      } else if (side < 0.75) {
        this.x = canvasWidth + this.radius;
        this.y = Math.random() * canvasHeight;
        this.dx = -Math.abs(Math.cos(angleToCenter) * maxSpeed) - 0.5;
        this.dy = Math.sin(angleToCenter) * maxSpeed;
      } else {
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + this.radius;
        this.dx = Math.cos(angleToCenter) * maxSpeed;
        this.dy = -Math.abs(Math.sin(angleToCenter) * maxSpeed) - 0.5;
      }

      // Original 5-vertex polygon offsets from RockMaker.java:
      // xpoints = {0, 25, 15, -5, -8}
      // ypoints = {0, 5, 30, 25, 15}
      // Center them around (0,0) for clean rotation
      const rawX = [0, 25, 15, -5, -8];
      const rawY = [0, 5, 30, 25, 15];
      const avgX = 5.4;
      const avgY = 15;

      this.localPoints = [];
      for (let i = 0; i < rawX.length; i++) {
        this.localPoints.push({
          x: (rawX[i] - avgX) * this.scale * 1.5,
          y: (rawY[i] - avgY) * this.scale * 1.5
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

      const pad = this.radius * 4;
      // Wraparound or remove when way out of bounds
      if (
        this.x < -pad ||
        this.x > canvasWidth + pad ||
        this.y < -pad ||
        this.y > canvasHeight + pad
      ) {
        return false; // ready for removal
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

      // Metallic asteroid rock styling
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.stroke();

      // Subtle inner crater detail
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.beginPath();
      ctx.arc(
        this.x + this.localPoints[1].x * 0.3,
        this.y + this.localPoints[1].y * 0.3,
        this.radius * 0.25,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
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

    containsBullet(bullet) {
      return this.containsPoint(bullet.x, bullet.y);
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
      const savedSize = parseInt(localStorage.getItem('spaceship_flight_ship_size') || '54', 10);
      this.width = Math.max(36, Math.min(76, savedSize));
      this.height = this.width;
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

    setSize(size) {
      this.width = Math.max(36, Math.min(76, size));
      this.height = this.width;
      try {
        localStorage.setItem('spaceship_flight_ship_size', this.width.toString());
      } catch (e) {}
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

    fire(bullets) {
      const rad = ((this.angle - 90) * Math.PI) / 180;
      const noseDist = this.height * 0.55;
      const bx = this.x + Math.cos(rad) * noseDist;
      const by = this.y + Math.sin(rad) * noseDist;

      bullets.push(new Bullet(bx, by, this.angle, this.dx, this.dy));
      this.soundFx.playLaser();
    }

    update() {
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

      // Screen wrapping
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      if (this.x > this.canvas.width + halfW) this.x = -halfW;
      else if (this.x < -halfW) this.x = this.canvas.width + halfW;
      if (this.y > this.canvas.height + halfH) this.y = -halfH;
      else if (this.y < -halfH) this.y = this.canvas.height + halfH;

      // Invincibility countdown
      if (this.invincible) {
        this.invincibleTimer--;
        if (this.invincibleTimer <= 0) {
          this.invincible = false;
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.angle * Math.PI) / 180);

      // Invincibility shield flicker effect
      if (this.invincible) {
        if (Math.floor(this.invincibleTimer / 6) % 2 === 0) {
          ctx.globalAlpha = 0.4;
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.width * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Select sprite: use moving versions showing fire underneath when gas is pressed
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
      this.soundFx = new SoundFX();
      this.particles = new ParticleSystem();
      this.starfield = new Starfield(this.canvas);
      this.ship = new Spaceship(this.canvas, this.soundFx, this.particles);

      this.bullets = [];
      this.rocks = [];
      this.rockSpawnTimer = 0;
      this.rockSpawnInterval = 110; // ~1.8 seconds at 60fps

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

        // Buttons
        btnLeft: document.getElementById('btnLeft'),
        btnRight: document.getElementById('btnRight'),
        btnThrust: document.getElementById('btnThrust'),
        btnFire: document.getElementById('btnFire'),

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
        settingStars: document.getElementById('settingStars'),
        settingSound: document.getElementById('settingSound'),
        settingTouchControls: document.getElementById('settingTouchControls'),
        menuShipPreview: document.getElementById('menuShipPreview'),

        // Results
        finalScoreVal: document.getElementById('finalScoreVal'),
        bestScoreVal: document.getElementById('bestScoreVal'),
        newHighScoreBanner: document.getElementById('newHighScoreBanner')
      };

      this.init();
    }

    init() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.domElements.highScoreDisplay.textContent = this.highScore;
      this.bindInputs();
      this.bindUI();

      // Main Loop
      let lastTime = performance.now();
      const loop = (currentTime) => {
        const delta = Math.min(100, currentTime - lastTime);
        lastTime = currentTime;

        this.update(delta);
        this.render();

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.starfield) this.starfield.resize();
    }

    bindInputs() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        if (e.repeat && e.code === 'Space') return; // prevent key spam

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
        () => {}
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
        this.domElements.settingShipSize.value = this.ship.width;
        if (this.domElements.shipSizeVal) {
          this.domElements.shipSizeVal.textContent = `${this.ship.width}px`;
        }
        this.domElements.settingShipSize.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.ship.setSize(val);
          if (this.domElements.shipSizeVal) {
            this.domElements.shipSizeVal.textContent = `${val}px`;
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
          } catch (err) {}
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
      if (modalName === 'settings') this.domElements.settingsModal.classList.add('active');
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

      // Initial rocks spawn
      for (let i = 0; i < 4; i++) {
        this.rocks.push(new Rock(this.canvas.width, this.canvas.height));
      }

      this.state = 'PLAYING';
    }

    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        this.ship.setThrust(false);
        this.showModal('pause');
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
      }
    }

    resumeGame() {
      this.hideModals();
      this.state = 'PLAYING';
    }

    restartGame() {
      this.startGame();
    }

    quitToMainMenu() {
      this.hideModals();
      this.ship.setThrust(false);
      this.state = 'START';
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
        if (idx < this.ship.lives) {
          icon.classList.add('active');
        } else {
          icon.classList.remove('active');
        }
      });
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

    update(delta) {
      if (this.screenShake > 0) {
        this.screenShake *= 0.9;
        if (this.screenShake < 0.5) this.screenShake = 0;
      }

      if (this.state === 'PLAYING') {
        // Continuous keyboard rotation
        if (this.keys.left) this.ship.rotateLeft();
        if (this.keys.right) this.ship.rotateRight();

        // Ship update
        this.ship.update();

        // Asteroid Spawning
        this.rockSpawnTimer++;
        if (this.rockSpawnTimer > this.rockSpawnInterval) {
          this.rockSpawnTimer = 0;
          if (this.rocks.length < 12) {
            this.rocks.push(new Rock(this.canvas.width, this.canvas.height));
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
  });
})();
