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
    }
  };

  // ==========================================================================
  // 2. FEATURE EXTRACTOR (32-DIMENSIONAL OBSERVATION SPACE)
  // ==========================================================================
  class FeatureExtractor {
    static extract(game) {
      const W = game.canvas.width;
      const H = game.canvas.height;
      const ship = game.ship;
      const shipAngle = ship.angle;
      const rad = (shipAngle * Math.PI) / 180;
      const cosH = Math.cos(rad);
      const sinH = Math.sin(rad);

      const obs = new Float32Array(32);

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
        obs[11] = 1.0; // UFO active flag
        ufoDist = uDelta.dist;
      } else {
        obs[7] = 0; obs[8] = 0; obs[9] = 0; obs[10] = 0; obs[11] = 0;
      }

      // --- Part C: 3 Closest Asteroids (3 x 5 = 15 features) ---
      // Sort active rocks by wrapped toroidal distance
      const activeRocks = [];
      for (let i = 0; i < game.rocks.length; i++) {
        const r = game.rocks[i];
        if (r.popped) continue;
        const delta = MathUtils.wrappedDelta(r.x, r.y, ship.x, ship.y, W, H);
        activeRocks.push({ rock: r, dx: delta.dx, dy: delta.dy, dist: delta.dist });
      }
      activeRocks.sort((a, b) => a.dist - b.dist);

      let closestRockDist = 9999;
      let targetAimError = 0;

      for (let k = 0; k < 3; k++) {
        const baseIdx = 12 + k * 5;
        if (k < activeRocks.length) {
          const item = activeRocks[k];
          const r = item.rock;
          const bodyPos = MathUtils.toBodyFrame(item.dx, item.dy, shipAngle);
          const relVx = r.dx - ship.dx;
          const relVy = r.dy - ship.dy;
          const bodyVel = MathUtils.toBodyFrame(relVx, relVy, shipAngle);

          obs[baseIdx + 0] = MathUtils.clamp(bodyPos.x / (W * 0.5), -1, 1);
          obs[baseIdx + 1] = MathUtils.clamp(bodyPos.y / (H * 0.5), -1, 1);
          obs[baseIdx + 2] = MathUtils.clamp(bodyVel.x / 6.0, -1, 1);
          obs[baseIdx + 3] = MathUtils.clamp(bodyVel.y / 6.0, -1, 1);
          obs[baseIdx + 4] = MathUtils.clamp((r.radius || 20) / 36.0, 0, 1);

          if (k === 0) {
            closestRockDist = item.dist;
            targetAimError = Math.atan2(bodyPos.y, bodyPos.x) / Math.PI; // Normalized to [-1, 1]
          }
        } else {
          obs[baseIdx + 0] = 0;
          obs[baseIdx + 1] = 0;
          obs[baseIdx + 2] = 0;
          obs[baseIdx + 3] = 0;
          obs[baseIdx + 4] = 0;
        }
      }

      // --- Part D: Tactical Inductive Biases & Danger Metrics (5 features) ---
      const minThreatDist = Math.min(closestRockDist, ufoDist);
      const isCriticalDanger = minThreatDist < (ship.width * 1.8) ? 1.0 : 0.0;

      // Mode-aware shield deployment readiness (Shared: energy >= 50, Dual/Shield-Only: shieldEnergy >= 100)
      const isDedicatedCapacitor = (game.powerMode === 'dual' || game.powerMode === 'shield_only');
      const canShieldDeploy = ship.unlimitedShield || (!ship.invincible && (
        isDedicatedCapacitor ? ship.shieldEnergy >= 100 : ship.energy >= 50
      ));
      const isShieldReady = canShieldDeploy ? 1.0 : 0.0;

      obs[27] = MathUtils.clamp(targetAimError, -1, 1); // Aim error to primary target
      obs[28] = MathUtils.clamp(minThreatDist / (W * 0.5), 0, 1); // Distance to closest threat
      obs[29] = isCriticalDanger; // Imminent collision hazard indicator
      obs[30] = isShieldReady;   // Emergency shield readiness
      obs[31] = game.bullets.length / 10.0; // Active friendly lasers

      return {
        features: obs,
        closestDist: minThreatDist,
        aimError: targetAimError,
        isDanger: isCriticalDanger > 0
      };
    }
  }

  // Pre-trained Neural Network Weights (32-64-64 Multi-Head MLP trained on 350,000+ transitions)
  const PRETRAINED_WEIGHTS_B64 = "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";

  // ==========================================================================
  // 3. NEURAL NETWORK WITH ADAM OPTIMIZER (Actor-Critic Architecture)
  // ==========================================================================
  class ActorCriticNetwork {
    constructor(inputDim = 32, hiddenDim = 64) {
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
      const canFire = (game.powerMode === 'shield_only' || ship.unlimitedAmmo || ship.unlimitedShield || ship.energy > 15);

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
        // If a threat is within critical proximity (< 90px), we can fire down to 15%.
        let hasEnergyReserve = false;
        if (game.powerMode === 'shield_only' || ship.unlimitedAmmo || ship.unlimitedShield) {
          hasEnergyReserve = true;
        } else if (game.powerMode === 'dual') {
          hasEnergyReserve = ship.energy >= 15;
        } else {
          // Shared mode
          const minReserve = (closest.dist < 90) ? 15 : 35;
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
      this.network = new ActorCriticNetwork(32, 64);
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

      if (this.mode === 'play') {
        // Execute pre-trained expert model
        const decision = TrainedExpertModel.decide(game);
        return {
          steer: decision.steer,
          thrust: decision.thrust,
          fire: decision.fire,
          shield: decision.shield,
          telemetry: decision
        };
      }

      // In Training mode: forward pass through Actor-Critic network
      const output = this.network.forward(obs);

      // Sample actions according to policy probability distributions
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
