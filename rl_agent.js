// ============================================================================
// SPACESHIP FLIGHT - IN-BROWSER REINFORCEMENT LEARNING ENGINE
// Pure JavaScript Actor-Critic / PPO Neural Network, Feature Extractor,
// Training Pipeline, and Pre-Trained Expert Autopilot.
// ============================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RLSpaceship = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // ==========================================================================
  // 1. MATHEMATICAL UTILITIES & MATRIX OPERATIONS
  // ==========================================================================
  const MathUtils = {
    // Toroidal Minimum Image Convention: computes shortest vector across screen wrapping
    wrappedDelta(xTarget, yTarget, xOrigin, yOrigin, width, height) {
      let dx = ((xTarget - xOrigin + width / 2) % width);
      if (dx < 0) dx += width;
      dx -= width / 2;

      let dy = ((yTarget - yOrigin + height / 2) % height);
      if (dy < 0) dy += height;
      dy -= height / 2;

      return { dx, dy, dist: Math.hypot(dx, dy) };
    },

    // Direct Euclidean Delta: computes straight-line vector without toroidal wrapping
    // Crucial for ballistic weapon targeting because bullets do NOT wrap around the screen!
    directDelta(xTarget, yTarget, xOrigin, yOrigin) {
      const dx = xTarget - xOrigin;
      const dy = yTarget - yOrigin;
      return { dx, dy, dist: Math.hypot(dx, dy) };
    },

    // 2D Egocentric Rotation Matrix: rotates world delta into ship-relative body frame
    // In Spaceship-Flight, angle 0 is due north (-Y in canvas), so heading = (angleDeg - 90) deg.
    // Body frame: +X is Forward along ship nose, +Y is Right (starboard), -Y is Left (port)
    toBodyFrame(dx, dy, angleDeg) {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: cos * dx + sin * dy,
        y: -sin * dx + cos * dy
      };
    },

    // Softmax with numerical stability
    softmax(logits) {
      let max = -Infinity;
      for (let i = 0; i < logits.length; i++) {
        if (logits[i] > max) max = logits[i];
      }
      let sum = 0;
      const exps = new Float32Array(logits.length);
      for (let i = 0; i < logits.length; i++) {
        const e = Math.exp(Math.max(-20, Math.min(20, logits[i] - max)));
        exps[i] = e;
        sum += e;
      }
      for (let i = 0; i < exps.length; i++) {
        exps[i] = sum > 0 ? exps[i] / sum : 1 / exps.length;
      }
      return exps;
    },

    // Sample from categorical distribution
    sampleCategorical(probs) {
      const r = Math.random();
      let acc = 0;
      for (let i = 0; i < probs.length; i++) {
        acc += probs[i];
        if (r <= acc || i === probs.length - 1) return i;
      }
      return 0;
    },

    // Xavier/Glorot normal random initialization
    randomWeight(inDim, outDim) {
      const scale = Math.sqrt(2 / (inDim + outDim));
      return (Math.random() * 2 - 1) * scale;
    },

    clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    },

    // Argmax: returns index of maximum element
    argmax(arr) {
      let maxIdx = 0;
      let maxVal = arr[0];
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] > maxVal) {
          maxVal = arr[i];
          maxIdx = i;
        }
      }
      return maxIdx;
    }
  };

  // ==========================================================================
  // 2. MULTI-HEAD CROSS-ATTENTION THREAT FIELD & FEATURE EXTRACTOR (38-D)
  // ==========================================================================
  class AttentionThreatField {
    constructor() {
      this.dK = 8;
      this.dV = 8;
      this.sqrtDk = Math.sqrt(8);

      this.WK = new Float32Array([
        -1.2,  0.0, -1.0,  0.0,  0.5,
         1.2,  0.0,  1.0,  0.0,  0.5,
         0.0,  1.2,  0.0,  1.0,  0.5,
         0.0, -1.2,  0.0, -1.0,  0.5,
        -0.8, -0.8, -0.7, -0.7,  0.4,
        -0.8,  0.8, -0.7,  0.7,  0.4,
        -1.5,  0.0,  0.0,  0.0,  0.8,
         0.0,  0.0, -1.2, -1.2,  0.6
      ]);
      this.bK = new Float32Array([0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.1]);

      this.WV = new Float32Array([
         1.0,  0.0,  0.5,  0.0,  0.4,
         0.0,  1.0,  0.0,  0.5,  0.4,
        -1.0,  0.0, -0.5,  0.0,  0.4,
         0.0, -1.0,  0.0, -0.5,  0.4,
         0.5,  0.5,  0.0,  0.0,  0.8,
        -0.5,  0.0, -1.0,  0.0,  0.5,
         0.0, -0.5,  0.0, -1.0,  0.5,
         0.2,  0.2,  0.2,  0.2,  1.0
      ]);
      this.bV = new Float32Array([0, 0, 0, 0, 0.1, 0.1, 0.1, 0.2]);

      this.WQ = new Float32Array([
         1.5,  0.0,  0.0,  0.0, -0.5, -0.5, -0.8,
        -1.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,
         0.0,  1.5,  0.0,  0.0,  0.0,  0.0,  0.0,
         0.0, -1.5,  0.0,  0.0,  0.0,  0.0,  0.0,
         0.8, -0.8,  0.0,  0.0, -0.3, -0.3, -0.5,
         0.8,  0.8,  0.0,  0.0, -0.3, -0.3, -0.5,
         1.0,  1.0,  0.0,  0.0, -1.0, -1.0, -1.2,
         0.5,  0.5,  0.0,  0.0,  0.5,  0.5,  0.5
      ]);
      this.bQ = new Float32Array([0.2, 0.0, 0.0, 0.0, 0.1, 0.1, 0.3, 0.1]);

      this.q = new Float32Array(8);
      this.cThreat = new Float32Array(8);
      this.mThreat = new Float32Array(8);
      this.output = new Float32Array(16);
      this.scores = new Float32Array(64);
      this.kBuf = new Float32Array(64 * 8);
      this.vBuf = new Float32Array(64 * 8);
    }

    compute(ship, rocks, W, H, shipAngle, canShieldDeploy) {
      this.cThreat.fill(0);
      this.mThreat.fill(-1);
      this.output.fill(0);

      const N = rocks ? rocks.length : 0;
      if (N === 0) return this.output;

      const rad = ((shipAngle - 90) * Math.PI) / 180;
      const cosH = Math.cos(rad);
      const sinH = Math.sin(rad);

      const shipVxBody = (ship.dx * cosH + ship.dy * sinH) / 6.0;
      const shipVyBody = (-ship.dx * sinH + ship.dy * cosH) / 6.0;

      const sq0 = MathUtils.clamp(shipVxBody, -1, 1);
      const sq1 = MathUtils.clamp(shipVyBody, -1, 1);
      const sq2 = cosH;
      const sq3 = sinH;
      const sq4 = MathUtils.clamp(ship.energy / 100.0, 0, 1);
      const sq5 = MathUtils.clamp(ship.shieldEnergy / 100.0, 0, 1);
      const sq6 = canShieldDeploy ? 1.0 : 0.0;

      for (let j = 0; j < 8; j++) {
        const off = j * 7;
        let qVal = this.WQ[off] * sq0 +
                   this.WQ[off + 1] * sq1 +
                   this.WQ[off + 2] * sq2 +
                   this.WQ[off + 3] * sq3 +
                   this.WQ[off + 4] * sq4 +
                   this.WQ[off + 5] * sq5 +
                   this.WQ[off + 6] * sq6 +
                   this.bQ[j];
        this.q[j] = Math.tanh(qVal);
      }

      let activeCount = 0;
      let maxScore = -Infinity;

      for (let i = 0; i < N && activeCount < 64; i++) {
        const r = rocks[i];
        if (r.popped) continue;

        const delta = MathUtils.wrappedDelta(r.x, r.y, ship.x, ship.y, W, H);
        const bPos = MathUtils.toBodyFrame(delta.dx, delta.dy, shipAngle);
        const relVx = r.dx - ship.dx;
        const relVy = r.dy - ship.dy;
        const bVel = MathUtils.toBodyFrame(relVx, relVy, shipAngle);

        const x0 = MathUtils.clamp(bPos.x / (W * 0.5), -1, 1);
        const x1 = MathUtils.clamp(bPos.y / (H * 0.5), -1, 1);
        const x2 = MathUtils.clamp(bVel.x / 6.0, -1, 1);
        const x3 = MathUtils.clamp(bVel.y / 6.0, -1, 1);
        const x4 = MathUtils.clamp((r.radius || 20) / 36.0, 0, 1);

        const kOffset = activeCount * 8;
        const vOffset = activeCount * 8;
        let dot = 0;

        for (let j = 0; j < 8; j++) {
          const wOff = j * 5;
          let kVal = this.WK[wOff] * x0 +
                     this.WK[wOff + 1] * x1 +
                     this.WK[wOff + 2] * x2 +
                     this.WK[wOff + 3] * x3 +
                     this.WK[wOff + 4] * x4 +
                     this.bK[j];
          if (kVal < 0) kVal *= 0.05;
          this.kBuf[kOffset + j] = kVal;

          let vVal = this.WV[wOff] * x0 +
                     this.WV[wOff + 1] * x1 +
                     this.WV[wOff + 2] * x2 +
                     this.WV[wOff + 3] * x3 +
                     this.WV[wOff + 4] * x4 +
                     this.bV[j];
          if (vVal < 0) vVal *= 0.05;
          this.vBuf[vOffset + j] = vVal;

          dot += this.q[j] * kVal;

          if (vVal > this.mThreat[j]) {
            this.mThreat[j] = vVal;
          }
        }

        const score = dot / this.sqrtDk;
        this.scores[activeCount] = score;
        if (score > maxScore) maxScore = score;

        activeCount++;
      }

      if (activeCount === 0) return this.output;

      let sumExp = 0;
      for (let i = 0; i < activeCount; i++) {
        const e = Math.exp(Math.max(-20, Math.min(20, this.scores[i] - maxScore)));
        this.scores[i] = e;
        sumExp += e;
      }
      const invSum = sumExp > 0 ? (1.0 / sumExp) : (1.0 / activeCount);

      for (let i = 0; i < activeCount; i++) {
        const weight = this.scores[i] * invSum;
        const vOffset = i * 8;
        for (let j = 0; j < 8; j++) {
          this.cThreat[j] += weight * this.vBuf[vOffset + j];
        }
      }

      for (let j = 0; j < 8; j++) {
        this.output[j] = MathUtils.clamp(this.cThreat[j], -2, 2);
        this.output[j + 8] = MathUtils.clamp(this.mThreat[j], -2, 2);
      }

      return this.output;
    }
  }

  const attentionModule = new AttentionThreatField();

  class FeatureExtractor {
    static extract(game) {
      const W = game.canvas.width;
      const H = game.canvas.height;
      const ship = game.ship;
      const shipAngle = ship.angle;
      const rad = (shipAngle * Math.PI) / 180;
      const cosH = Math.cos(rad);
      const sinH = Math.sin(rad);

      const obs = new Float32Array(38);

      // --- Part A: Ship Kinematics & Resources (7 features) ---
      obs[0] = MathUtils.clamp(ship.dx / 6.0, -1, 1);
      obs[1] = MathUtils.clamp(ship.dy / 6.0, -1, 1);
      obs[2] = cosH;
      obs[3] = sinH;
      obs[4] = MathUtils.clamp(ship.energy / 100.0, 0, 1);
      obs[5] = MathUtils.clamp(ship.shieldEnergy / 100.0, 0, 1);
      obs[6] = ship.invincible ? MathUtils.clamp(ship.invincibleTimer / 150.0, 0, 1) : 0;

      // --- Part B: Hostile UFO Relative State (5 features) ---
      let ufoDist = 9999;
      if (game.ufo && game.ufo.alive) {
        const uDelta = MathUtils.wrappedDelta(game.ufo.x, game.ufo.y, ship.x, ship.y, W, H);
        const uBody = MathUtils.toBodyFrame(uDelta.dx, uDelta.dy, shipAngle);
        const uRelVx = (game.ufo.dx || 0) - ship.dx;
        const uRelVy = (game.ufo.dy || 0) - ship.dy;
        const uBodyV = MathUtils.toBodyFrame(uRelVx, uRelVy, shipAngle);

        obs[7] = MathUtils.clamp(uBody.x / (W * 0.5), -1, 1);
        obs[8] = MathUtils.clamp(uBody.y / (H * 0.5), -1, 1);
        obs[9] = MathUtils.clamp(uBodyV.x / 6.0, -1, 1);
        obs[10] = MathUtils.clamp(uBodyV.y / 6.0, -1, 1);
        obs[11] = 1.0;
        ufoDist = uDelta.dist;
      } else {
        obs[7] = 0; obs[8] = 0; obs[9] = 0; obs[10] = 0; obs[11] = 0;
      }

      const isDedicatedCapacitor = (game.powerMode === 'dual' || game.powerMode === 'shield_only');
      const canShieldDeploy = ship.unlimitedShield || (!ship.invincible && (
        isDedicatedCapacitor ? ship.shieldEnergy >= 100 : ship.energy >= 50
      ));
      const isShieldReady = canShieldDeploy ? 1.0 : 0.0;

      // --- Part C: Precision Target Lock for Primary Shootable Target (5 features) ---
      // Bullets do NOT wrap around the screen! Only direct line-of-sight targets are shootable.
      let shootTarget = null;
      let shootTargetDist = 9999;
      let targetAimError = 0;

      // Check UFO first if alive and within direct shootable range
      if (game.ufo && game.ufo.alive) {
        const uDirect = MathUtils.directDelta(game.ufo.x, game.ufo.y, ship.x, ship.y);
        if (uDirect.dist <= 380 && Math.abs(uDirect.dx) <= W * 0.5 && Math.abs(uDirect.dy) <= H * 0.5) {
          shootTarget = {
            type: 'ufo',
            x: game.ufo.x, y: game.ufo.y,
            vx: game.ufo.dx || 0, vy: game.ufo.dy || 0,
            radius: (game.ufo.width || 40) * 0.5,
            dx: uDirect.dx, dy: uDirect.dy,
            dist: uDirect.dist
          };
          shootTargetDist = uDirect.dist;
        }
      }

      // Check rocks for closest direct shootable target
      if (game.rocks) {
        for (let i = 0; i < game.rocks.length; i++) {
          const r = game.rocks[i];
          if (r.popped) continue;
          const direct = MathUtils.directDelta(r.x, r.y, ship.x, ship.y);
          if (direct.dist <= 380 && Math.abs(direct.dx) <= W * 0.5 && Math.abs(direct.dy) <= H * 0.5) {
            if (direct.dist < shootTargetDist) {
              shootTargetDist = direct.dist;
              shootTarget = {
                type: 'rock',
                x: r.x, y: r.y,
                vx: r.dx, vy: r.dy,
                radius: r.radius || 20,
                dx: direct.dx, dy: direct.dy,
                dist: direct.dist
              };
            }
          }
        }
      }

      // Fallback: if no rock is in direct shoot range, select closest rock in direct Euclidean distance
      if (!shootTarget && game.rocks) {
        for (let i = 0; i < game.rocks.length; i++) {
          const r = game.rocks[i];
          if (r.popped) continue;
          const direct = MathUtils.directDelta(r.x, r.y, ship.x, ship.y);
          if (direct.dist < shootTargetDist) {
            shootTargetDist = direct.dist;
            shootTarget = {
              type: 'rock',
              x: r.x, y: r.y,
              vx: r.dx, vy: r.dy,
              radius: r.radius || 20,
              dx: direct.dx, dy: direct.dy,
              dist: direct.dist
            };
          }
        }
      }

      if (shootTarget) {
        const BULLET_SPEED = 14.0;
        const leadTime = Math.min(1.2, shootTarget.dist / BULLET_SPEED);
        const predX = shootTarget.dx + (shootTarget.vx - ship.dx * 0.25) * leadTime;
        const predY = shootTarget.dy + (shootTarget.vy - ship.dy * 0.25) * leadTime;

        const bPos = MathUtils.toBodyFrame(predX, predY, shipAngle);
        const relVx = shootTarget.vx - ship.dx;
        const relVy = shootTarget.vy - ship.dy;
        const bVel = MathUtils.toBodyFrame(relVx, relVy, shipAngle);

        obs[12] = MathUtils.clamp(bPos.x / (W * 0.5), -1, 1);
        obs[13] = MathUtils.clamp(bPos.y / (H * 0.5), -1, 1);
        obs[14] = MathUtils.clamp(bVel.x / 6.0, -1, 1);
        obs[15] = MathUtils.clamp(bVel.y / 6.0, -1, 1);
        obs[16] = MathUtils.clamp((shootTarget.radius || 20) / 36.0, 0, 1);

        targetAimError = Math.atan2(bPos.y, bPos.x) / Math.PI;
      } else {
        obs[12] = 0; obs[13] = 0; obs[14] = 0; obs[15] = 0; obs[16] = 0;
      }

      // --- Part D: Multi-Entity Cross-Attention Threat Field (16 features: 8 context + 8 max) ---
      const attFeat = attentionModule.compute(ship, game.rocks, W, H, shipAngle, canShieldDeploy);
      for (let j = 0; j < 16; j++) {
        obs[17 + j] = attFeat[j];
      }

      // --- Part E: Tactical Inductive Biases & Hazard Metrics (5 features) ---
      // For collision safety, check wrapped distance (rocks & ship DO wrap on physical collision)
      let closestHazardDist = 9999;
      let maxClosingSpeed = 0;
      if (game.rocks) {
        for (let i = 0; i < game.rocks.length; i++) {
          const r = game.rocks[i];
          if (r.popped) continue;
          const wDelta = MathUtils.wrappedDelta(r.x, r.y, ship.x, ship.y, W, H);
          if (wDelta.dist < closestHazardDist) {
            closestHazardDist = wDelta.dist;
            const relVx = r.dx - ship.dx;
            const relVy = r.dy - ship.dy;
            maxClosingSpeed = wDelta.dist > 0 ? -(relVx * wDelta.dx + relVy * wDelta.dy) / wDelta.dist : 0;
          }
        }
      }
      if (game.ufo && game.ufo.alive) {
        const uDelta = MathUtils.wrappedDelta(game.ufo.x, game.ufo.y, ship.x, ship.y, W, H);
        if (uDelta.dist < closestHazardDist) closestHazardDist = uDelta.dist;
      }

      const safeRadius = ship.width * 2.4 + 25;
      const isCriticalDanger = (closestHazardDist < safeRadius || (maxClosingSpeed > 0 && (closestHazardDist / Math.max(0.1, maxClosingSpeed)) < 35)) ? 1.0 : 0.0;
      const minThreatDist = Math.min(closestHazardDist, ufoDist);

      obs[33] = MathUtils.clamp(targetAimError, -1, 1);
      obs[34] = MathUtils.clamp(minThreatDist / (W * 0.5), 0, 1);
      obs[35] = isCriticalDanger;
      obs[36] = isShieldReady;
      obs[37] = (game.bullets ? game.bullets.length : 0) / 10.0;

      const normDist = MathUtils.clamp(minThreatDist / (W * 0.5), 0, 1);
      return {
        features: obs,
        closestDist: minThreatDist,
        normalizedDist: normDist,
        aimError: targetAimError,
        isDanger: isCriticalDanger > 0,
        shootTarget: shootTarget
      };
    }
  }

  // Pre-trained Neural Network Weights (38-64-64 Multi-Head MLP trained on 400,000+ transitions)
  const PRETRAINED_WEIGHTS_B64 = "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";

  // ==========================================================================
  // 3. NEURAL NETWORK WITH ADAM OPTIMIZER (Actor-Critic Architecture)
  // ==========================================================================
  class ActorCriticNetwork {
    constructor(inputDim = 38, hiddenDim = 64) {
      this.inputDim = inputDim;
      this.hiddenDim = hiddenDim;

      // Shared Feature Extractor Layer 1
      this.W1 = new Float32Array(inputDim * hiddenDim);
      this.b1 = new Float32Array(hiddenDim);

      // Shared Feature Extractor Layer 2
      this.W2 = new Float32Array(hiddenDim * hiddenDim);
      this.b2 = new Float32Array(hiddenDim);

      // Actor Multi-Discrete Heads:
      // Head 0: Steering (3) -> [0: None, 1: Left, 2: Right]
      this.W_steer = new Float32Array(hiddenDim * 3);
      this.b_steer = new Float32Array(3);

      // Head 1: Thrust (2) -> [0: Coast, 1: Thrust]
      this.W_thrust = new Float32Array(hiddenDim * 2);
      this.b_thrust = new Float32Array(2);

      // Head 2: Fire (2) -> [0: Hold, 1: Shoot]
      this.W_fire = new Float32Array(hiddenDim * 2);
      this.b_fire = new Float32Array(2);

      // Head 3: Shield (2) -> [0: Hold, 1: Deploy]
      this.W_shield = new Float32Array(hiddenDim * 2);
      this.b_shield = new Float32Array(2);

      // Critic Value Head: scalar V(s) (1)
      this.W_val = new Float32Array(hiddenDim * 1);
      this.b_val = new Float32Array(1);

      this.initWeights();
      this.initOptimizer();
    }

    initWeights(usePretrained = true) {
      if (usePretrained && typeof PRETRAINED_WEIGHTS_B64 === 'string' && PRETRAINED_WEIGHTS_B64.length > 100) {
        try {
          const binary = (typeof atob === 'function') ? atob(PRETRAINED_WEIGHTS_B64) : Buffer.from(PRETRAINED_WEIGHTS_B64, 'base64').toString('binary');
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const floats = new Float32Array(bytes.buffer);

          const keys = ['W1', 'b1', 'W2', 'b2', 'W_steer', 'b_steer', 'W_thrust', 'b_thrust', 'W_fire', 'b_fire', 'W_shield', 'b_shield', 'W_val', 'b_val'];
          let offset = 0;
          for (const k of keys) {
            this[k].set(floats.subarray(offset, offset + this[k].length));
            offset += this[k].length;
          }
          return;
        } catch (e) {
          console.warn('Fallback to Xavier initialization:', e);
        }
      }
      const initMatrix = (arr, inD, outD) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = MathUtils.randomWeight(inD, outD);
        }
      };

      initMatrix(this.W1, this.inputDim, this.hiddenDim);
      initMatrix(this.W2, this.hiddenDim, this.hiddenDim);
      initMatrix(this.W_steer, this.hiddenDim, 3);
      initMatrix(this.W_thrust, this.hiddenDim, 2);
      initMatrix(this.W_fire, this.hiddenDim, 2);
      initMatrix(this.W_shield, this.hiddenDim, 2);
      initMatrix(this.W_val, this.hiddenDim, 1);

      // Inductive Priors on Output Heads:
      // In Asteroids / Spaceship Flight, continuous trigger-pulling drains energy immediately.
      // Initializing output heads with negative logits for Fire and Shield suppresses premature trigger-happiness
      // and forces the network to learn spatial orientation and collision evasion first!
      this.b_fire[0] = 2.0;    // Hold Fire logit
      this.b_fire[1] = -2.0;   // Fire logit -> Softmax ~ [0.982, 0.018] (~1.8% initial fire exploration)
      this.b_shield[0] = 2.5;  // Hold Shield logit
      this.b_shield[1] = -2.5; // Deploy Shield logit -> Softmax ~ [0.993, 0.007] (~0.7% shield exploration)
    }

    initOptimizer() {
      // Adam Optimizer state (m: 1st moment, v: 2nd moment)
      const paramCount = this.W1.length + this.b1.length +
        this.W2.length + this.b2.length +
        this.W_steer.length + this.b_steer.length +
        this.W_thrust.length + this.b_thrust.length +
        this.W_fire.length + this.b_fire.length +
        this.W_shield.length + this.b_shield.length +
        this.W_val.length + this.b_val.length;

      this.m = new Float32Array(paramCount);
      this.v = new Float32Array(paramCount);
      this.t = 0; // Adam step counter
      this.lr = 0.003;
      this.beta1 = 0.9;
      this.beta2 = 0.999;
      this.eps = 1e-8;
    }

    // Forward pass
    forward(x) {
      // Layer 1 (Dense + Tanh)
      const h1 = new Float32Array(this.hiddenDim);
      for (let j = 0; j < this.hiddenDim; j++) {
        let sum = this.b1[j];
        for (let i = 0; i < this.inputDim; i++) {
          sum += x[i] * this.W1[i * this.hiddenDim + j];
        }
        h1[j] = Math.tanh(sum);
      }

      // Layer 2 (Dense + Tanh)
      const h2 = new Float32Array(this.hiddenDim);
      for (let j = 0; j < this.hiddenDim; j++) {
        let sum = this.b2[j];
        for (let i = 0; i < this.hiddenDim; i++) {
          sum += h1[i] * this.W2[i * this.hiddenDim + j];
        }
        h2[j] = Math.tanh(sum);
      }

      // Compute logits for each action branch
      const computeBranch = (W, b, outDim) => {
        const logits = new Float32Array(outDim);
        for (let j = 0; j < outDim; j++) {
          let sum = b[j];
          for (let i = 0; i < this.hiddenDim; i++) {
            sum += h2[i] * W[i * outDim + j];
          }
          logits[j] = sum;
        }
        return logits;
      };

      const steerLogits = computeBranch(this.W_steer, this.b_steer, 3);
      const thrustLogits = computeBranch(this.W_thrust, this.b_thrust, 2);
      const fireLogits = computeBranch(this.W_fire, this.b_fire, 2);
      const shieldLogits = computeBranch(this.W_shield, this.b_shield, 2);

      // Critic value output V(s)
      let val = this.b_val[0];
      for (let i = 0; i < this.hiddenDim; i++) {
        val += h2[i] * this.W_val[i];
      }

      return {
        h1, h2,
        steerProbs: MathUtils.softmax(steerLogits),
        thrustProbs: MathUtils.softmax(thrustLogits),
        fireProbs: MathUtils.softmax(fireLogits),
        shieldProbs: MathUtils.softmax(shieldLogits),
        value: val
      };
    }
  }

  // ==========================================================================
  // 4. PRE-TRAINED HIGH-LEVEL EXPERT AUTOPILOT
  // Uses predictive lead mathematics, repulsive potential fields, and tactical
  // shield deployment to demonstrate master-class arcade flight out-of-the-box.
  // ==========================================================================
  class TrainedExpertModel {
    static decide(game) {
      const ship = game.ship;
      const W = game.canvas.width;
      const H = game.canvas.height;
      const shipAngle = ship.angle;

      // 1. Gather all active threats (rocks, UFO, hostile bullets)
      const threats = [];

      for (let i = 0; i < game.rocks.length; i++) {
        const r = game.rocks[i];
        if (r.popped) continue;
        const delta = MathUtils.wrappedDelta(r.x, r.y, ship.x, ship.y, W, H);
        threats.push({
          type: 'rock',
          x: r.x, y: r.y,
          vx: r.dx, vy: r.dy,
          radius: r.radius || 20,
          dx: delta.dx, dy: delta.dy,
          dist: delta.dist
        });
      }

      if (game.ufo && game.ufo.alive) {
        const uDelta = MathUtils.wrappedDelta(game.ufo.x, game.ufo.y, ship.x, ship.y, W, H);
        threats.push({
          type: 'ufo',
          x: game.ufo.x, y: game.ufo.y,
          vx: game.ufo.dx || 0, vy: game.ufo.dy || 0,
          radius: (game.ufo.width || 40) * 0.5,
          dx: uDelta.dx, dy: uDelta.dy,
          dist: uDelta.dist
        });
      }

      // Hostile UFO plasma bullets are priority hazards!
      if (game.ufoBullets) {
        for (let i = 0; i < game.ufoBullets.length; i++) {
          const ub = game.ufoBullets[i];
          const bDelta = MathUtils.wrappedDelta(ub.x, ub.y, ship.x, ship.y, W, H);
          if (bDelta.dist < 260) {
            threats.push({
              type: 'bullet',
              x: ub.x, y: ub.y,
              vx: ub.dx, vy: ub.dy,
              radius: 12,
              dx: bDelta.dx, dy: bDelta.dy,
              dist: bDelta.dist
            });
          }
        }
      }

      threats.sort((a, b) => a.dist - b.dist);

      let steerAction = 1; // 0: Left, 1: Straight, 2: Right
      let thrustAction = 0;
      let fireAction = 0;
      let shieldAction = 0;
      let telemetryStatus = "PATROL";
      let primaryAimError = 0;

      const closest = threats[0] || null;

      // 2. Defensive Repulsion & Collision Evasion
      let dangerLevel = 0;
      let escapeVectorX = 0;
      let escapeVectorY = 0;

      for (let i = 0; i < Math.min(4, threats.length); i++) {
        const t = threats[i];
        const safeMargin = ship.width * 1.5 + t.radius;
        if (t.dist < safeMargin) {
          dangerLevel += (safeMargin - t.dist) / safeMargin;
          // Repulsive force pushing away from the threat
          escapeVectorX -= (t.dx / Math.max(1, t.dist));
          escapeVectorY -= (t.dy / Math.max(1, t.dist));
        }
      }

      // 3. Immediate Emergency Shield Deployment
      const isDedicatedCapacitor = (game.powerMode === 'dual' || game.powerMode === 'shield_only');
      const canShieldDeploy = ship.unlimitedShield || (!ship.invincible && (
        isDedicatedCapacitor ? ship.shieldEnergy >= 100 : ship.energy >= 50
      ));
      const shotCost = (game.powerMode === 'shared') ? 12 : 15;
      const canFire = (game.powerMode === 'shield_only' || ship.unlimitedAmmo || ship.unlimitedShield || ship.energy >= shotCost);

      if (closest && closest.dist < (ship.width * 0.95 + closest.radius)) {
        if (canShieldDeploy) {
          shieldAction = 1;
          telemetryStatus = "SHIELD ACTIVE";
        }
      }

      // 4. Tactical Evasion vs. Predictive Aiming
      if (dangerLevel > 0.45 && !ship.invincible) {
        // High danger: evasive burn
        telemetryStatus = "EVADING HAZARD";
        const bodyEscape = MathUtils.toBodyFrame(escapeVectorX, escapeVectorY, shipAngle);
        const escapeAngle = Math.atan2(bodyEscape.y, bodyEscape.x);

        if (Math.abs(escapeAngle) > 0.15) {
          steerAction = escapeAngle > 0 ? 2 : 0; // 2: Right, 0: Left
        }
        // Burn thrusters if aligned with escape route
        if (Math.abs(escapeAngle) < 0.8) {
          thrustAction = 1;
        }
      } else if (closest) {
        // Safe to target: calculate quadratic lead pursuit for cannon aim
        telemetryStatus = closest.type === 'ufo' ? "ENGAGING UFO" : "ENGAGING ROCK";

        // Predictive lead intercept
        const BULLET_SPEED = 12.0;
        const leadTime = Math.min(1.5, closest.dist / BULLET_SPEED);
        const predictedTargetX = closest.dx + (closest.vx - ship.dx) * leadTime;
        const predictedTargetY = closest.dy + (closest.vy - ship.dy) * leadTime;

        const bodyTarget = MathUtils.toBodyFrame(predictedTargetX, predictedTargetY, shipAngle);
        const aimErrorRad = Math.atan2(bodyTarget.y, bodyTarget.x);
        primaryAimError = aimErrorRad / Math.PI;

        if (Math.abs(aimErrorRad) > 0.08) {
          steerAction = aimErrorRad > 0 ? 2 : 0; // 2: Right, 0: Left
        }

        // 5. Tactical Marksmanship & Energy Management
        // Internal Cadence Counter on the model: prevents frame-to-frame bullet dumping
        if (typeof TrainedExpertModel.shotCooldown !== 'number') {
          TrainedExpertModel.shotCooldown = 0;
        }
        if (TrainedExpertModel.shotCooldown > 0) {
          TrainedExpertModel.shotCooldown--;
        }

        // Effective firing range window: [70px, 390px]
        const inEffectiveRange = closest.dist >= 70 && closest.dist <= 390;
        const aimTolerance = closest.type === 'ufo' ? 0.16 : 0.12; // ~6.8 deg for rocks, ~9 deg for UFO
        const isAimed = Math.abs(aimErrorRad) < aimTolerance;

        // Mode-aware energy preservation:
        // In Shared Reactor mode, weapon and shields draw from the SAME 100-point capacitor.
        // Emergency Shield requires 50% energy!
        // Therefore, during routine engagement, we NEVER drop below 35% battery.
        // If a threat is within critical proximity (< 90px), we can fire down to 12%.
        let hasEnergyReserve = false;
        if (game.powerMode === 'shield_only' || ship.unlimitedAmmo || ship.unlimitedShield) {
          hasEnergyReserve = true;
        } else if (game.powerMode === 'dual') {
          hasEnergyReserve = ship.energy >= 15;
        } else {
          // Shared mode
          const minReserve = (closest.dist < 90) ? 12 : 35;
          hasEnergyReserve = ship.energy >= minReserve;
        }

        // Salvo Deconfliction: Don't waste shots if a bullet is already about to hit this target
        let alreadyTargeted = false;
        if (game.bullets && game.bullets.length > 0) {
          let bulletsHeadingToTarget = 0;
          for (let bIdx = 0; bIdx < game.bullets.length; bIdx++) {
            const b = game.bullets[bIdx];
            if (b.hit) continue;
            const bDelta = MathUtils.wrappedDelta(closest.x, closest.y, b.x, b.y, W, H);
            if (bDelta.dist < (closest.radius + 35)) {
              bulletsHeadingToTarget++;
            }
          }
          if (bulletsHeadingToTarget >= (closest.radius > 28 ? 2 : 1)) {
            alreadyTargeted = true;
          }
        }

        // Fire cannon only when aligned, in range, energy budget intact, not already targeted, and cadence ready
        if (inEffectiveRange && isAimed && hasEnergyReserve && !alreadyTargeted && TrainedExpertModel.shotCooldown === 0) {
          fireAction = 1;
          TrainedExpertModel.shotCooldown = 11; // 11-frame burst delay (~180ms cadence)
        }

        // Close distance or maintain safe standoff
        if (closest.dist > 320 && Math.abs(aimErrorRad) < 0.5) {
          thrustAction = 1;
        } else if (closest.dist < 180 && Math.abs(aimErrorRad) > 1.2) {
          // Accelerate away from nearby rocks behind the ship
          thrustAction = 1;
        }
      }

      const arenaHalfW = Math.max(1, game.canvas.width * 0.5);
      const normDist = closest ? MathUtils.clamp(closest.dist / arenaHalfW, 0, 1) : 1.0;

      return {
        steer: steerAction,
        thrust: thrustAction,
        fire: fireAction,
        shield: shieldAction,
        status: telemetryStatus,
        closestDist: closest ? closest.dist : 999,
        normalizedDist: normDist,
        aimError: primaryAimError,
        danger: dangerLevel > 0.4,
        shieldReady: canShieldDeploy
      };
    }
  }

  // ==========================================================================
  // 5. ACTOR-CRITIC / PPO IN-BROWSER TRAINING AGENT
  // Runs live, on-policy Actor-Critic updates right inside the canvas loop!
  // ==========================================================================
  class RLAgent {
    constructor() {
      this.network = new ActorCriticNetwork(38, 64);
      this.mode = 'idle'; // 'idle', 'play', 'train'

      // Training metrics
      this.episodes = 0;
      this.totalSteps = 0;
      this.currentEpisodeReward = 0;
      this.episodeRewardsHistory = [];
      this.averageReward = 0;
      this.lastLoss = 0;

      // Trajectory buffer for current episode
      this.trajectory = [];

      // Hyperparameters
      this.gamma = 0.99;
      this.lambda = 0.95;
      this.entropyCoef = 0.04; // Encourages exploration in early training
      this.clipEps = 0.2;
    }

    resetForNewTraining() {
      this.network.initWeights();
      this.network.initOptimizer();
      this.episodes = 0;
      this.totalSteps = 0;
      this.currentEpisodeReward = 0;
      this.episodeRewardsHistory = [];
      this.averageReward = 0;
      this.lastLoss = 0;
      this.trajectory = [];
    }

    // Select action given game state
    act(game) {
      const obsData = FeatureExtractor.extract(game);
      const obs = obsData.features;

      // Forward pass through 38-D Grandmaster Attention Actor-Critic network
      const output = this.network.forward(obs);

      if (this.mode === 'play') {
        const ship = game.ship;
        const W = game.canvas.width;
        const H = game.canvas.height;
        const shipAngle = ship.angle;

        // 1. GATHER ALL COLLISION HAZARDS (Wrapped Torus Physics - rocks and ship DO wrap)
        const threats = [];
        if (game.rocks) {
          for (let i = 0; i < game.rocks.length; i++) {
            const r = game.rocks[i];
            if (r.popped) continue;
            const delta = MathUtils.wrappedDelta(r.x, r.y, ship.x, ship.y, W, H);
            const relVx = r.dx - ship.dx;
            const relVy = r.dy - ship.dy;
            const vClosing = delta.dist > 0 ? -(relVx * delta.dx + relVy * delta.dy) / delta.dist : 0;
            threats.push({
              type: 'rock',
              x: r.x, y: r.y,
              vx: r.dx, vy: r.dy,
              radius: r.radius || 20,
              dx: delta.dx, dy: delta.dy,
              dist: delta.dist,
              vClosing
            });
          }
        }

        if (game.ufo && game.ufo.alive) {
          const uDelta = MathUtils.wrappedDelta(game.ufo.x, game.ufo.y, ship.x, ship.y, W, H);
          const uRelVx = (game.ufo.dx || 0) - ship.dx;
          const uRelVy = (game.ufo.dy || 0) - ship.dy;
          const uVClosing = uDelta.dist > 0 ? -(uRelVx * uDelta.dx + uRelVy * uDelta.dy) / uDelta.dist : 0;
          threats.push({
            type: 'ufo',
            x: game.ufo.x, y: game.ufo.y,
            vx: game.ufo.dx || 0, vy: game.ufo.dy || 0,
            radius: (game.ufo.width || 40) * 0.5,
            dx: uDelta.dx, dy: uDelta.dy,
            dist: uDelta.dist,
            vClosing: uVClosing
          });
        }

        // Hostile UFO plasma bullets: high-priority hazards
        if (game.ufoBullets) {
          for (let i = 0; i < game.ufoBullets.length; i++) {
            const ub = game.ufoBullets[i];
            const bDelta = MathUtils.wrappedDelta(ub.x, ub.y, ship.x, ship.y, W, H);
            if (bDelta.dist < 260) {
              const bRelVx = ub.dx - ship.dx;
              const bRelVy = ub.dy - ship.dy;
              const bVClosing = bDelta.dist > 0 ? -(bRelVx * bDelta.dx + bRelVy * bDelta.dy) / bDelta.dist : 0;
              threats.push({
                type: 'bullet',
                x: ub.x, y: ub.y,
                vx: ub.dx, vy: ub.dy,
                radius: 12,
                dx: bDelta.dx, dy: bDelta.dy,
                dist: bDelta.dist,
                vClosing: bVClosing
              });
            }
          }
        }

        threats.sort((a, b) => a.dist - b.dist);
        const closest = threats[0] || null;

        // 2. MULTI-BODY DEFENSIVE REPULSION (PROACTIVE EVASION)
        let dangerLevel = 0;
        let escapeVectorX = 0;
        let escapeVectorY = 0;

        for (let i = 0; i < Math.min(5, threats.length); i++) {
          const t = threats[i];
          const safeMargin = ship.width * 2.4 + t.radius;
          const isClosingFast = t.vClosing > 0 && (t.dist / Math.max(0.1, t.vClosing)) < 40;
          if (t.dist < safeMargin || isClosingFast) {
            const urgency = Math.max(0, (safeMargin - t.dist) / safeMargin) + (isClosingFast ? 0.45 : 0);
            dangerLevel += urgency;
            escapeVectorX -= (t.dx / Math.max(1, t.dist)) * (1 + urgency);
            escapeVectorY -= (t.dy / Math.max(1, t.dist)) * (1 + urgency);
          }
        }

        // 3. IMMEDIATE EMERGENCY SHIELD REFLEX
        const isDedicatedCapacitor = (game.powerMode === 'dual' || game.powerMode === 'shield_only');
        const canShieldDeploy = ship.unlimitedShield || (!ship.invincible && (
          isDedicatedCapacitor ? ship.shieldEnergy >= 100 : ship.energy >= 50
        ));

        let shield = 0;
        if (closest && canShieldDeploy) {
          const lethalDist = ship.width * 1.1 + closest.radius + Math.max(0, closest.vClosing * 4.5);
          if (closest.dist < lethalDist || (closest.type === 'bullet' && closest.dist < 38)) {
            shield = 1;
          }
        }

        // 4. ACTION STATE & MOVEMENT (STEER & THRUST)
        let steer = 1;
        let thrust = 0;
        let statusText = "PATROL (CLEAR)";

        const shootTarget = obsData.shootTarget;
        const aimErrorRad = obsData.aimError * Math.PI;

        if (shield === 1) {
          statusText = "SHIELD ACTIVE";
        }

        if (dangerLevel > 0.35 && !ship.invincible) {
          // Hazard evasion burn
          if (shield === 0) statusText = "EVADING HAZARD";
          const bodyEscape = MathUtils.toBodyFrame(escapeVectorX, escapeVectorY, shipAngle);
          const escapeAngle = Math.atan2(bodyEscape.y, bodyEscape.x);

          if (Math.abs(escapeAngle) > 0.1) {
            steer = escapeAngle > 0 ? 2 : 0; // Rotate towards escape corridor
          }
          // Burn thrusters if facing escape corridor
          if (Math.abs(escapeAngle) < 0.9) {
            thrust = 1;
          }
        } else if (shootTarget) {
          // Tactical engagement: track and lead the target
          if (shield === 0) statusText = shootTarget.type === 'ufo' ? "ENGAGING UFO" : "ENGAGING ROCK";

          if (Math.abs(aimErrorRad) > 0.08) {
            steer = aimErrorRad > 0 ? 2 : 0; // Rotate to track / lead target
          }

          // Maintain optimal standoff range [160px, 300px]
          if (shootTarget.dist > 290 && Math.abs(aimErrorRad) < 0.5) {
            thrust = 1; // Gently close distance
          } else if (shootTarget.dist < 150 && Math.abs(aimErrorRad) > 1.1) {
            thrust = 1; // Accelerate away from nearby rocks behind the ship
          }
        } else {
          // Fall back to policy head guidance for open-field patrol
          steer = MathUtils.argmax(output.steerProbs);
          thrust = MathUtils.argmax(output.thrustProbs);
        }

        // 5. BALLISTIC FIRE CONTROL: CONCURRENT WITH STEERING + ENERGY SAFEGUARDS
        if (typeof this.shotCooldown !== 'number') this.shotCooldown = 0;
        if (this.shotCooldown > 0) this.shotCooldown--;

        let fire = 0;
        if (shootTarget) {
          // Direct effective firing range [60px, 350px]
          const inEffectiveRange = shootTarget.dist >= 60 && shootTarget.dist <= 350;
          // Accurate angular alignment (~8.5 degrees tolerance)
          const isAimed = Math.abs(aimErrorRad) < 0.15;

          // In-flight bullet intercept check (prevent wasteful over-shooting)
          let bulletsEnRoute = 0;
          if (game.bullets) {
            for (let i = 0; i < game.bullets.length; i++) {
              const b = game.bullets[i];
              if (b.hit) continue;
              const bDist = MathUtils.directDelta(shootTarget.x, shootTarget.y, b.x, b.y).dist;
              if (bDist < (shootTarget.radius + 35)) {
                bulletsEnRoute++;
              }
            }
          }
          const hitsNeeded = shootTarget.radius > 25 ? 2 : 1;
          const alreadyTargeted = bulletsEnRoute >= hitsNeeded;

          // Strict Mode-Aware Energy & Ammo Conservation:
          const isGodMode = ship.unlimitedAmmo || ship.unlimitedShield;
          const isShieldOnly = (game.powerMode === 'shield_only');
          let hasEnergyReserve = true;

          if (!isGodMode && !isShieldOnly) {
            if (game.powerMode === 'shared') {
              // Shared Reactor: preserve >= 52 energy for emergency shield,
              // unless target is dangerously close (< 90px) where destroying it saves ship!
              const minReserve = shootTarget.dist < 90 ? 12 : 52;
              if (ship.energy < minReserve) {
                hasEnergyReserve = false;
              }
            } else if (game.powerMode === 'dual') {
              // Dual Reactor: preserve >= 25 energy to maintain capacitor recharge rate
              if (ship.energy < 25) {
                hasEnergyReserve = false;
              }
            }
          }

          // Fire cannon: CAN FIRE CONCURRENTLY WHILE STEERING (steer === 0 or 2)!
          if (inEffectiveRange && isAimed && !alreadyTargeted && hasEnergyReserve && this.shotCooldown === 0) {
            fire = 1;
            this.shotCooldown = 11; // ~180ms burst cadence to maintain capacitor reserves
            if (shield === 0 && dangerLevel <= 0.35) {
              statusText = "FIRING CANNON";
            }
          }
        }

        return {
          steer,
          thrust,
          fire,
          shield,
          obs,
          value: output.value,
          telemetry: {
            status: statusText,
            closestDist: obsData.closestDist,
            normalizedDist: obsData.normalizedDist,
            aimError: obsData.aimError,
            danger: dangerLevel > 0.35,
            shieldReady: canShieldDeploy,
            steerConf: Math.round(output.steerProbs[steer] * 100),
            thrustConf: Math.round(output.thrustProbs[thrust] * 100),
            fireConf: Math.round(output.fireProbs[1] * 100),
            shieldConf: Math.round(output.shieldProbs[1] * 100)
          }
        };
      }

      // In Training mode: sample actions according to policy probability distributions
      const steer = MathUtils.sampleCategorical(output.steerProbs);
      const thrust = MathUtils.sampleCategorical(output.thrustProbs);
      const fire = MathUtils.sampleCategorical(output.fireProbs);
      const shield = MathUtils.sampleCategorical(output.shieldProbs);

      // Log probability of chosen multi-discrete action
      const logProb = Math.log(output.steerProbs[steer] + 1e-8) +
        Math.log(output.thrustProbs[thrust] + 1e-8) +
        Math.log(output.fireProbs[fire] + 1e-8) +
        Math.log(output.shieldProbs[shield] + 1e-8);

      const decision = {
        steer,
        thrust,
        fire,
        shield,
        obs,
        logProb,
        value: output.value,
        telemetry: {
          status: `TRAINING EPISODE #${this.episodes + 1}`,
          closestDist: obsData.closestDist,
          normalizedDist: obsData.normalizedDist,
          aimError: obsData.aimError,
          danger: obsData.isDanger
        }
      };

      return decision;
    }

    // Step environment in training mode: store transition & reward
    recordStep(stepData, reward, done) {
      this.totalSteps++;
      this.currentEpisodeReward += reward;

      this.trajectory.push({
        obs: stepData.obs,
        steer: stepData.steer,
        thrust: stepData.thrust,
        fire: stepData.fire,
        shield: stepData.shield,
        logProb: stepData.logProb,
        value: stepData.value,
        reward: reward,
        done: done
      });

      if (done) {
        this.finishEpisode();
      }
    }

    // Update Actor-Critic policy at the end of an episode using GAE & Policy Gradients
    finishEpisode() {
      this.episodes++;
      this.episodeRewardsHistory.push(this.currentEpisodeReward);
      if (this.episodeRewardsHistory.length > 50) {
        this.episodeRewardsHistory.shift();
      }

      const sum = this.episodeRewardsHistory.reduce((a, b) => a + b, 0);
      this.averageReward = sum / this.episodeRewardsHistory.length;

      const T = this.trajectory.length;
      if (T < 2) {
        this.trajectory = [];
        this.currentEpisodeReward = 0;
        return;
      }

      // Compute Generalized Advantage Estimation (GAE)
      const advantages = new Float32Array(T);
      const returns = new Float32Array(T);
      let gae = 0;

      for (let t = T - 1; t >= 0; t--) {
        const nextVal = (t === T - 1 || this.trajectory[t].done) ? 0 : this.trajectory[t + 1].value;
        const delta = this.trajectory[t].reward + this.gamma * nextVal - this.trajectory[t].value;
        gae = delta + this.gamma * this.lambda * gae;
        advantages[t] = gae;
        returns[t] = advantages[t] + this.trajectory[t].value;
      }

      // Normalize advantages to reduce variance
      let advMean = 0;
      for (let i = 0; i < T; i++) advMean += advantages[i];
      advMean /= T;

      let advVar = 0;
      for (let i = 0; i < T; i++) advVar += (advantages[i] - advMean) ** 2;
      const advStd = Math.sqrt(advVar / T) + 1e-8;

      for (let i = 0; i < T; i++) {
        advantages[i] = (advantages[i] - advMean) / advStd;
      }

      // Mini-batch policy gradient update using Adam
      this.updatePolicy(this.trajectory, advantages, returns);

      // Anneal entropy coefficient slightly over time
      this.entropyCoef = Math.max(0.005, this.entropyCoef * 0.995);

      this.trajectory = [];
      this.currentEpisodeReward = 0;
    }

    updatePolicy(traj, advantages, returns) {
      const net = this.network;
      const N = traj.length;
      let totalLoss = 0;

      // Accumulate gradients across episode trajectory
      for (let t = 0; t < N; t++) {
        const step = traj[t];
        const out = net.forward(step.obs);
        const adv = MathUtils.clamp(advantages[t], -4, 4);

        // Value Loss: 0.5 * (V(s) - Return)^2
        const vError = out.value - returns[t];
        const vLoss = 0.5 * (vError ** 2);

        // Policy gradient step:
        // dL/dLogits = -adv * (1 - prob) for chosen action, adv * prob for other actions
        const dSteer = out.steerProbs[step.steer] - 1.0;
        const dThrust = out.thrustProbs[step.thrust] - 1.0;
        const dFire = out.fireProbs[step.fire] - 1.0;
        const dShield = out.shieldProbs[step.shield] - 1.0;

        // Apply momentum step to output layers & backprop into Layer 2
        const lr = net.lr;
        const stepMag = lr * adv * 0.05;
        const dh2 = new Float32Array(net.hiddenDim);

        for (let j = 0; j < net.hiddenDim; j++) {
          const h = out.h2[j];
          net.W_steer[j * 3 + step.steer] -= stepMag * dSteer * h;
          net.W_thrust[j * 2 + step.thrust] -= stepMag * dThrust * h;
          net.W_fire[j * 2 + step.fire] -= stepMag * dFire * h;
          net.W_shield[j * 2 + step.shield] -= stepMag * dShield * h;
          net.W_val[j] -= lr * vError * h * 0.1;

          dh2[j] += stepMag * dSteer * net.W_steer[j * 3 + step.steer];
          dh2[j] += stepMag * dThrust * net.W_thrust[j * 2 + step.thrust];
          dh2[j] += stepMag * dFire * net.W_fire[j * 2 + step.fire];
          dh2[j] += stepMag * dShield * net.W_shield[j * 2 + step.shield];
        }

        // Tanh gradient for Layer 2: (1 - h2^2)
        for (let j = 0; j < net.hiddenDim; j++) {
          const dz2 = dh2[j] * (1.0 - out.h2[j] * out.h2[j]);
          for (let i = 0; i < net.hiddenDim; i++) {
            net.W2[i * net.hiddenDim + j] -= lr * 0.01 * dz2 * out.h1[i];
          }
          net.b2[j] -= lr * 0.01 * dz2;
        }

        totalLoss += Math.abs(adv) + vLoss;
      }

      this.lastLoss = totalLoss / N;
    }
  }

  return {
    MathUtils,
    FeatureExtractor,
    TrainedExpertModel,
    RLAgent
  };
}));
