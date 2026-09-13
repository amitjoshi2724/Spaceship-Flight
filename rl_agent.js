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

    initWeights() {
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
      let telemetryStatus = "PATROL / HUNT";
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
          telemetryStatus = "EMERGENCY SHIELD DEPLOYED";
        }
      }

      // 4. Tactical Evasion vs. Predictive Aiming
      if (dangerLevel > 0.45 && !ship.invincible) {
        // High danger: evasive burn
        telemetryStatus = "EVADING IMMINENT HAZARD";
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
        telemetryStatus = closest.type === 'ufo' ? "UFO TARGET LOCKED" : "TARGET ACQUIRED";

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

        // Fire cannon when nose is closely aligned with lead trajectory
        if (Math.abs(aimErrorRad) < 0.22 && canFire) {
          fireAction = 1;
        }

        // Close distance or maintain safe standoff
        if (closest.dist > 320 && Math.abs(aimErrorRad) < 0.5) {
          thrustAction = 1;
        } else if (closest.dist < 180 && Math.abs(aimErrorRad) > 1.2) {
          // Accelerate away from nearby rocks behind the ship
          thrustAction = 1;
        }
      }

      return {
        steer: steerAction,
        thrust: thrustAction,
        fire: fireAction,
        shield: shieldAction,
        status: telemetryStatus,
        closestDist: closest ? closest.dist : 999,
        aimError: primaryAimError,
        danger: dangerLevel > 0.4
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

        // Apply simple momentum step to output layers
        const lr = net.lr;
        const stepMag = lr * adv * 0.05;

        for (let j = 0; j < net.hiddenDim; j++) {
          const h = out.h2[j];
          net.W_steer[j * 3 + step.steer] -= stepMag * dSteer * h;
          net.W_thrust[j * 2 + step.thrust] -= stepMag * dThrust * h;
          net.W_fire[j * 2 + step.fire] -= stepMag * dFire * h;
          net.W_shield[j * 2 + step.shield] -= stepMag * dShield * h;
          net.W_val[j] -= lr * vError * h * 0.1;
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
