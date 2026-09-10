# The Definitive Arcade Game AI Guide: From Zero to Intelligent Enemies

A comprehensive engineering guide for building responsive, organic, and intelligent game AIs in 2D arcade games. No academic fluff, no heavy machine learning, and no external libraries required — just pure, high-performance mathematics and physics that run in under 0.1 milliseconds per frame.

---

## Guide Structure

This guide is partitioned into two distinct, self-contained sections:

* **[PART I: THE UNIVERSAL 2D ARCADE AI PLAYBOOK](#part-i-the-universal-2d-arcade-ai-playbook)**  
  General, engine-agnostic algorithms, mathematical formulations, and game design principles applicable to *any* 2D arcade, top-down shooter, or action game.
* **[PART II: CASE STUDY: THE "SPACESHIP FLIGHT" ENEMY UFO](#part-ii-case-study-the-spaceship-flight-enemy-ufo)**  
  The concrete, production-grade implementation of our enemy saucer: its specific `ContextSteeringBrain`, the dual-sided Port (Red) / Starboard (Blue) CIWS turrets, the 50/50 offensive telegraphing, diegetic hull lighting, and energy siphon mechanics.

---

# Table of Contents

### Part I: The Universal 2D Arcade AI Playbook
1. [The Golden Rule: The Illusion of Intelligence](#1-the-golden-rule-the-illusion-of-intelligence)
2. [The 3 Paradigms of Arcade AI](#2-the-3-paradigms-of-arcade-ai)
3. [The Flaw of Vector Addition (Why Forces Cancel Out)](#3-the-flaw-of-vector-addition-why-forces-cancel-out)
4. [Context Steering: The Mathematical Foundation](#4-context-steering-the-mathematical-foundation)
   - [4.1 Discretizing Space (The N-Ray Compass)](#41-discretizing-space-the-n-ray-compass)
   - [4.2 Relative Kinematics & Closing Velocity](#42-relative-kinematics--closing-velocity)
   - [4.3 Quadratic Urgency Curve (Inverse-Square Law)](#43-quadratic-urgency-curve-inverse-square-law)
   - [4.4 Ray Projection, Lateral Clearance & Dynamic Trajectories](#44-ray-projection-lateral-clearance--dynamic-trajectories)
   - [4.5 The Danger Map Equation](#45-the-danger-map-equation)
   - [4.6 The Tactical Interest Map Equation](#46-the-tactical-interest-map-equation)
   - [4.7 Net Scoring & Responsive Hysteresis](#47-net-scoring--responsive-hysteresis)
   - [4.8 Hard Safety Overrides (Hierarchical Masking)](#48-hard-safety-overrides-hierarchical-masking)
   - [4.9 Adaptive Agility & Active Retro-Braking](#49-adaptive-agility--active-retro-braking)
5. [The Anti-Jitter Playbook (Making Movement Feel Alive)](#5-the-anti-jitter-playbook-making-movement-feel-alive)
6. [Combat & Weapon AI in General](#6-combat--weapon-ai-in-general)
   - [6.1 First-Order vs. Exact Quadratic Predictive Intercept](#61-first-order-vs-exact-quadratic-predictive-intercept)
   - [6.2 Human Reaction Latency (Ring Buffers)](#62-human-reaction-latency-ring-buffers)
   - [6.3 The Inaccuracy Gaussian Cone (Box-Muller Transform)](#63-the-inaccuracy-gaussian-cone-box-muller-transform)
   - [6.4 The "Near-Miss" Adrenaline Factor](#64-the-near-miss-adrenaline-factor)
7. [Defensive Point-Defense (CIWS) Concepts](#7-defensive-point-defense-ciws-concepts)
   - [7.1 Single Tactical Weapon vs. Decoupled Dual Channels](#71-single-tactical-weapon-vs-decoupled-dual-channels)
   - [7.2 Common Kinematic Pitfalls (Frames vs. Seconds & Projected Rays)](#72-common-kinematic-pitfalls-frames-vs-seconds--projected-rays)
8. [Arcade AI Archetypes Zoo](#8-arcade-ai-archetypes-zoo)
9. [Spatial Awareness: Line-of-Sight, Cover & Influence Maps](#9-spatial-awareness-line-of-sight-cover--influence-maps)
10. [High-Level Brains, Pacing & Patterns](#10-high-level-brains-pacing--patterns)
    - [10.1 The AI Director & Attack Token Bucket](#101-the-ai-director--attack-token-bucket)
    - [10.2 Geometric Bullet Patterns (Danmaku Trigonometry)](#102-geometric-bullet-patterns-danmaku-trigonometry)
    - [10.3 Sensory Perception (Vision Cones & Audio Bubbles)](#103-sensory-perception-vision-cones--audio-bubbles)
    - [10.4 Brain State Architectures: FSMs vs. BTs vs. Utility Systems](#104-brain-state-architectures-fsms-vs-bts-vs-utility-systems)
11. [Universal Engineering Essentials](#11-universal-engineering-essentials)
    - [11.1 Screen-Independent Responsive Scaling](#111-screen-independent-responsive-scaling)
    - [11.2 The Math Cheatsheet](#112-the-math-cheatsheet)

### Part II: Case Study: The "Spaceship Flight" Enemy UFO
12. [Saucer Profile: The Orbiting Harasser](#12-saucer-profile-the-orbiting-harasser)
13. [Production Code: The UFO Context Steering Engine](#13-production-code-the-ufo-context-steering-engine)
14. [The UFO's Dual-Channel Combat System](#14-the-ufos-dual-channel-combat-system)
    - [14.1 Channel 1: Dual-Sided Defensive CIWS (Port Red vs. Starboard Blue)](#141-channel-1-dual-sided-defensive-ciws-port-red-vs-starboard-blue)
    - [14.2 Clarifying Hull Muzzle Location vs. Dynamic Lead Aiming](#142-clarifying-hull-muzzle-location-vs-dynamic-lead-aiming)
    - [14.3 Channel 2: Offensive Laser Cannon (50% Emerald Direct / 50% Violet Lead)](#143-channel-2-offensive-laser-cannon-50-emerald-direct--50-violet-lead)
15. [Diegetic Hull Light System (`enemyship.png` Mathematical Mapping)](#15-diegetic-hull-light-system-enemyshippng-mathematical-mapping)
16. [UFO Economy & Destruction Rewards (Energy Siphon)](#16-ufo-economy--destruction-rewards-energy-siphon)

---

# PART I: THE UNIVERSAL 2D ARCADE AI PLAYBOOK

---

## 1. The Golden Rule: The Illusion of Intelligence

In video games, **you are not building an autonomous agent; you are directing an actor playing a role.**

Players do not have access to an AI's internal state machine or neural weights. They judge intelligence purely through three observable behaviors:
1. **Decisiveness**: Moving smoothly toward an objective without stuttering, freezing, or vibrating in place.
2. **Reactivity**: Noticeably and dynamically altering flight paths when hazards approach.
3. **Telegraphing**: Giving visual and audible hints immediately before taking high-impact actions (e.g. charging weapons, banking into hard turns).

An AI built with 30 lines of clean geometry that smooths its steering and telegraphs its intentions feels significantly smarter and more satisfying to fight than a 2,000-line neural network that twitches on every frame.

---

## 2. The 3 Paradigms of Arcade AI

| Level | Technique | Typical Use Cases | Why It Breaks in Complex Arenas |
|---|---|---|---|
| **Level 1: Direct Heading** | `Math.atan2(targetY - y, targetX - x)` | Guided missiles, homing bullets, retro ghosts | Zero obstacle awareness; slams directly into walls and rocks. |
| **Level 2: Reynolds Steering** | $\vec{F}_{\text{total}} = \vec{F}_{\text{chase}} + \sum \vec{F}_{\text{repel}}$ | Open-field boids, simple flocking birds | **Vector Cancellation**: Opposing forces sum to zero, freezing the agent or forcing it into dead ends. |
| **Level 3: Context Steering** | Discretize $N$ candidate rays, compute **Danger Map** vs. **Interest Map**, pick highest score | Dynamic asteroid fields, racing AI, dogfighters | Naturally navigates tight corridors, moving hazards, and gaps without special-case logic. |

---

## 3. The Flaw of Vector Addition (Why Forces Cancel Out)

The classic bug in Reynolds-style steering occurs when an agent attempts to navigate between two approaching obstacles:

```
      [Obstacle A]  ──(Push Right: +10)──►  [AI 🛸]  ◄──(Push Left: -10)──  [Obstacle B]
                                              │
                                              ▼ (Chasing Goal: +5 Forward)
```

Summing the forces:
$$\vec{F}_{\text{total}} = (+10, 0) + (-10, 0) + (0, +5) = (0, +5)$$

The lateral repulsion forces cancel out perfectly ($+10 - 10 = 0$). The net force points straight ahead, steering the AI directly into the squeeze point where it crashes. Adding naive distance checks (`if (dist < 30)`) causes the agent to oscillate violently between the two objects.

---

## 4. Context Steering: The Mathematical Foundation

Context Steering eliminates vector cancellation by separating **where the agent wants to go** from **where it is dangerous to go**, evaluating every possible direction independently.

```
                         0° (Ray 0)
                  337.5°     22.5°
              315°                 45°
           292.5°                   67.5°
     (West) 270°          🛸          90° (East)
           247.5°                   112.5°
              225°                 135°
                  202.5°     157.5°
                        180° (South)
```

### 4.1 Discretizing Space (The N-Ray Compass)
Discretize continuous 2D space into $N$ candidate direction unit vectors $\hat{d}_k$ for $k \in \{0, 1, \dots, N-1\}$:

$$\theta_k = \frac{2\pi k}{N}, \quad \hat{d}_k = \begin{bmatrix} \cos\theta_k \\ \sin\theta_k \end{bmatrix}$$

For $N = 16$, the angular resolution is $\Delta\theta = 22.5^\circ$.

---

### 4.2 Relative Kinematics & Closing Velocity
Let the AI ship be at position $\vec{x}_{\text{ai}}$ with velocity $\vec{v}_{\text{ai}}$. For obstacle $i$ at $\vec{x}_i$ with velocity $\vec{v}_i$:

$$\vec{r}_i = \vec{x}_i - \vec{x}_{\text{ai}}, \quad d_i = \|\vec{r}_i\|$$
$$\vec{v}_{\text{rel}, i} = \vec{v}_i - \vec{v}_{\text{ai}}$$

The **closing velocity** $v_{\text{close}, i}$ measures how rapidly the obstacle is converging radially toward the ship:

$$v_{\text{close}, i} = -\frac{\vec{r}_i \cdot \vec{v}_{\text{rel}, i}}{d_i}$$

- $v_{\text{close}, i} \le 0$: The obstacle is drifting away or traveling parallel. No immediate collision.
- $v_{\text{close}, i} > 0$: The obstacle is actively closing distance.

The **time to impact** $t_{\text{impact}, i}$ is:
$$t_{\text{impact}, i} = \begin{cases} \dfrac{d_i}{v_{\text{close}, i}}, & \text{if } v_{\text{close}, i} > v_{\text{threshold}} \\ \infty, & \text{otherwise} \end{cases}$$

---

### 4.3 Quadratic Urgency Curve (Inverse-Square Law)
Physical displacement required to evade a collision under constant acceleration $a$ within time $t$ is:

$$d = \frac{1}{2} a t^2 \implies a_{\text{required}} = \frac{2d}{t_{\text{impact}}^2}$$

Because required avoidance acceleration scales with the **inverse square of time**, the urgency curve must be quadratic:

$$U_i = \frac{1}{\max(\epsilon, t_{\text{impact}, i}^2)}$$

*Why linear urgency ($1/t$) fails*: At $t = 1.0\text{s}$, $U = 1.0$; at $t = 0.5\text{s}$, $U = 2.0$. The gradient is too shallow, leaving the AI feeling "safe" until $t < 0.25\text{s}$ when inertia makes collision unavoidable. With $1/t^2$, urgency jumps from $2.78$ at $t = 0.6\text{s}$ to $8.16$ at $t = 0.35\text{s}$, initiating decisive early evasive action.

---

### 4.4 Ray Projection, Lateral Clearance & Dynamic Trajectories
For each candidate ray $\hat{d}_k$, project the obstacle vector $\vec{r}_i$ onto the ray:

$$\text{proj}_{k, i} = \vec{r}_i \cdot \hat{d}_k$$

The lateral distance from the ray to the obstacle center is:
$$d_{\text{lat}}(k, i) = \left\| \vec{r}_i - \text{proj}_{k, i} \hat{d}_k \right\| = \sqrt{d_i^2 - \text{proj}_{k, i}^2}$$

Given safety envelope $R_{\text{safe}, i} = R_{\text{ai}} + R_{\text{obs}, i} + \text{buffer}$, the **penetration depth ratio** $P_{k, i} \in [0, 1]$ is:
$$P_{k, i} = \max\left(0, 1 - \frac{d_{\text{lat}}(k, i)}{R_{\text{safe}, i}}\right)$$

#### The "Outrunning Trap" & Velocity-Obstacle Trajectories
If an obstacle approaches faster than the AI from behind, naive static raycasting assumes the forward path is clear because $\vec{r}_i \cdot \hat{d}_k < 0$. The AI tries to run away in a straight line and gets crushed.

To solve this, evaluate the **Velocity Obstacle** along candidate ray $\hat{d}_k$ at boost speed $v_{\text{boost}}$:
$$\vec{v}_{\text{rel}, k} = \vec{v}_{\text{obs}} - (\hat{d}_k \cdot v_{\text{boost}})$$

If $\vec{r}_i \cdot \vec{v}_{\text{rel}, k} < 0$, the time of closest approach is:
$$t_{\text{close}} = -\frac{\vec{r}_i \cdot \vec{v}_{\text{rel}, k}}{\|\vec{v}_{\text{rel}, k}\|^2}$$

If $t_{\text{close}} \in (0, 1.25\text{s})$ and the minimum future distance $d_{\text{min}} = \|\vec{r}_i + \vec{v}_{\text{rel}, k} t_{\text{close}}\| < R_{\text{safe}}$, that ray receives an insurmountable penalty ($-100.0$), forcing the AI to break **laterally** out of the path.

---

### 4.5 The Danger Map Equation
Sum all threats within radar range, weighting by quadratic penetration:

$$D(k) = \sum_{i \in \text{threats}} U_i \cdot (P_{k, i})^2$$

Quadratic penetration $(P_{k, i})^2$ ensures rays grazing an edge receive minor penalties, while rays cutting through the obstacle's core suffer heavy penalties, keeping narrow corridors open.

---

### 4.6 The Tactical Interest Map Equation
The Interest Map balances tactical desires:

$$I(k) = w_{\text{goal}} I_{\text{goal}}(k) + w_{\text{flank}} I_{\text{flank}}(k) + w_{\text{bound}} I_{\text{bound}}(k) + w_{\text{inertia}} I_{\text{inertia}}(k)$$

1. **Combat Standoff Range ($\tanh$)**:
   $$\delta(d_p) = \tanh\left(\frac{d_p - D_{\text{standoff}}}{\sigma}\right) \in (-1, 1)$$
   - $d_p > D_{\text{standoff}} \implies \delta > 0$ (pursue target).
   - $d_p < D_{\text{standoff}} \implies \delta < 0$ (kite and retreat).
   - $I_{\text{goal}}(k) = \delta(d_p) \cdot (\hat{d}_k \cdot \hat{u}_{\text{target}})$.
2. **Flanking / Circling**:
   $$\hat{u}_{\text{perp}} = \text{dir}_{\text{orbit}} \begin{bmatrix} -\hat{u}_{\text{target}, y} \\ \hat{u}_{\text{target}, x} \end{bmatrix}, \quad I_{\text{flank}}(k) = \hat{d}_k \cdot \hat{u}_{\text{perp}}$$
3. **Soft Screen Boundary Cushion**:
   Generates an inward repulsion vector when entering the screen margin $M$, preventing corner trapping.
4. **Directional Inertia**:
   $$I_{\text{inertia}}(k) = \hat{d}_k \cdot \frac{\vec{v}_{\text{ai}}}{\|\vec{v}_{\text{ai}}\|}$$
   Rewards the current heading to prevent frame-by-frame steering jitter.

---

### 4.7 Net Scoring & Responsive Hysteresis
Every ray receives a net score:
$$S(k) = I(k) - w_d D(k)$$

The best candidate is $k^* = \arg\max_k S(k)$.

**The Golden Rule of Hysteresis**: *Stubbornness is only for safe cruising; it must immediately yield to danger.*

$$\text{Active Ray} \leftarrow \begin{cases} 
k^*, & \text{if } D(k_{\text{current}}) > 0.15 \quad \text{(danger on current path)} \\
k^*, & \text{if } D(k^*) < D(k_{\text{current}}) \quad \text{(safer alternative)} \\
k^*, & \text{if } S(k^*) > S(k_{\text{current}}) + 0.15 \quad \text{(significantly better path)} \\
k_{\text{current}}, & \text{otherwise (smooth cruising)}
\end{cases}$$

---

### 4.8 Hard Safety Overrides (Hierarchical Masking)
When danger is imminent ($t_{\text{impact}} < 1.6\text{s}$):
1. **Zero Out Aggression**: Set $w_{\text{goal}} = 0$, $w_{\text{flank}} = 0$, and $w_{\text{inertia}} = 0$. Survival strictly overrides combat.
2. **Hard Barrier Penalty**:
   $$S(k) = \begin{cases} I_{\text{boundary}}(k), & \text{if } D(k) = 0 \\ -100.0 - 25.0 \cdot D(k), & \text{if } D(k) > 0 \end{cases}$$
   No amount of pursuit desire can ever cause the AI to choose an obstacle over an open corridor.

---

### 4.9 Adaptive Agility & Active Retro-Braking
Using a single high turn rate across all situations produces unnatural twitching. Agility and thrusters should scale dynamically:
- **Cruising**: Gentle, cinematic turning ($\alpha \approx 0.10$).
- **Evasion**: Sharp, decisive turning ($\alpha \approx 0.35 - 0.50$) with thruster overdrive ($1.25\times - 1.55\times$).
- **Active Retro-Braking**: When reversing direction ($\hat{d}^* \cdot \hat{v} < -0.15$) or boxed in, damp velocity ($\vec{v} \leftarrow 0.65\vec{v}$) to kill old momentum and redirect cleanly.

---

## 5. The Anti-Jitter Playbook (Making Movement Feel Alive)

Real spacecraft have physical mass and aerodynamic stability. Four techniques eliminate jitter entirely:

1. **Inertia Rewarding**: Adding $w_{\text{inertia}} \approx 0.7$ stabilizes straight paths.
2. **Switching Deadbands**: Demanding $\Delta S > 0.15$ prevents 1% score oscillations between adjacent rays.
3. **Velocity Smoothing**:
   ```javascript
   this.dx += (targetDx - this.dx) * agility;
   this.dy += (targetDy - this.dy) * agility;
   ```
4. **Dynamic Banking Tilt**: Roll the sprite by $\pm 15^\circ$ proportional to lateral acceleration ($\Delta v_x \cdot 3.5$) to convey weight and intent.

---

## 6. Combat & Weapon AI in General

### 6.1 First-Order vs. Exact Quadratic Predictive Intercept
Firing directly at moving targets guarantees a miss. The AI must solve for the future intercept point $\vec{x}_{\text{intercept}}$.

#### First-Order Approximation
$$t_{\text{flight}} \approx \frac{\|\vec{x}_{\text{target}} - \vec{x}_{\text{gun}}\|}{v_{\text{bullet}}}$$
$$\vec{x}_{\text{aim}} = \vec{x}_{\text{target}} + \vec{v}_{\text{target}} \cdot t_{\text{flight}}$$

#### Exact Quadratic Intercept
Solving $\|\vec{x}_t + \vec{v}_t t - \vec{x}_g\| = v_b t$ yields $A t^2 + B t + C = 0$:
$$A = \|\vec{v}_t\|^2 - v_b^2, \quad B = 2(\vec{r} \cdot \vec{v}_t), \quad C = \|\vec{r}\|^2$$
Discriminant $\Delta = B^2 - 4AC$. If $\Delta \ge 0$, earliest valid intercept is $t^* = \frac{-B - \sqrt{\Delta}}{2A}$.

---

### 6.2 Human Reaction Latency (Ring Buffers)
A 60fps computer AI with 0ms reaction time feels oppressive and robotic. Human players require $200\text{ms} - 350\text{ms}$ to react to sudden turns.

Buffer target positions over 15 frames:
```javascript
this.targetHistory.push({ x: target.x, y: target.y, dx: target.dx, dy: target.dy });
if (this.targetHistory.length > 15) this.targetHistory.shift();
const perceivedTarget = this.targetHistory[0]; // 250ms delayed tracking
```
When the player cuts reverse thrust, the AI overshoots briefly before correcting, producing realistic dogfights.

---

### 6.3 The Inaccuracy Gaussian Cone (Box-Muller Transform)
Apply angular noise sampled from a normal distribution $\Delta\theta \sim \mathcal{N}(0, \sigma^2)$ using the Box-Muller transform:
```javascript
const u1 = Math.max(1e-6, Math.random());
const u2 = Math.random();
const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
const angleOffset = Math.max(-2.2 * sigma, Math.min(2.2 * sigma, z0 * sigma));
const aimAngle = Math.atan2(aimY, aimX) + angleOffset;
```

### 6.4 The "Near-Miss" Adrenaline Factor
Tuning inaccuracy so shots pass within 10–25 pixels of the cockpit creates high-adrenaline gameplay where players feel like skilled escape pilots.

---

## 7. Defensive Point-Defense (CIWS) Concepts

### 7.1 Single Tactical Weapon vs. Decoupled Dual Channels
- **Single Tactical Weapon**: Firing defensively at an obstacle puts the main gun on full cooldown, creating vulnerability windows for the player.
- **Dual-Channel System**: Decouples offensive player combat (deliberate 1.5s–2.5s cadence) from defensive obstacle survival (rapid ~0.75s cadence). Prevents the AI from overwhelming the player while keeping it alive in dense hazard fields.

### 7.2 Common Kinematic Pitfalls
1. **Frames vs. Seconds**: If $v_{\text{closing}}$ is in px/frame, $t_{\text{impact}} = \text{dist} / (v_{\text{closing}} \cdot 60)$ must be in seconds.
2. **The "Projected Ray" Blinder**: Never check threats only along the current steering heading. Flank threats require omnidirectional radial kinematics ($d < R_{\text{bubble}}$ and $t_{\text{impact}} < t_{\text{danger}}$).

---

## 8. Arcade AI Archetypes Zoo

By altering interest weights, any archetype can be built on the same Context Steering engine:

* **The Berserker**: $w_{\text{goal}} = 2.5, w_{\text{danger}} = 1.0, w_{\text{inertia}} = 1.4, w_{\text{flank}} = 0.0$.
* **The Sniper / Kiter**: $D_{\text{standoff}} = 0.70 D_{\text{screen}}, w_{\text{goal}} = 1.8, w_{\text{danger}} = 4.5$, 100% predictive aim.
* **The Swarm / Wolfpack**: Treat teammates as obstacle spheres with $R_{\text{separation}} = 2.5 R_{\text{ship}}$ to encircle the player without clumping.
* **The Bodyguard**: Sets interest goal to the midpoint between the player and a high-value VIP/Boss.

---

## 9. Spatial Awareness: Line-of-Sight, Cover & Influence Maps

### Line-of-Sight (LoS) Ray-Circle Test
Given target line $\vec{L} = \vec{x}_p - \vec{x}_{\text{ai}}$ and obstacle at $\vec{r} = \vec{x}_{\text{obs}} - \vec{x}_{\text{ai}}$:
$$t_{\text{proj}} = \vec{r} \cdot \frac{\vec{L}}{\|\vec{L}\|}$$
$$d_\perp = \sqrt{\|\vec{r}\|^2 - t_{\text{proj}}^2}$$
$$\text{Line of Sight is Blocked} \iff 0 < t_{\text{proj}} < \|\vec{L}\| \quad \text{and} \quad d_\perp < R_{\text{obs}} + R_{\text{buffer}}$$

### Dynamic Cover Points
When retreating, project the shadow vector:
$$\vec{x}_{\text{cover}} = \vec{x}_{\text{obs}} + (R_{\text{obs}} + R_{\text{ai}} + \text{buffer}) \cdot \frac{\vec{x}_{\text{obs}} - \vec{x}_p}{\|\vec{x}_{\text{obs}} - \vec{x}_p\|}$$

### Macro Influence Maps
Discretize the arena into an $M \times N$ coarse grid and diffuse hazard heat:
$$I_{x, y}(t + \Delta t) = (1 - \lambda) I_{x, y}(t) + \frac{\lambda}{4} \sum_{\text{neighbors}} I_{i, j}(t)$$
The micro Context Steering engine steers toward the lowest-heat macro cell.

---

## 10. High-Level Brains, Pacing & Patterns

### 10.1 The AI Director & Attack Token Bucket
Limits simultaneous attacks to prevent undodgeable bullet walls:
```javascript
class AIDirector {
  constructor(maxTokens = 2) {
    this.maxTokens = maxTokens;
    this.availableTokens = maxTokens;
  }
  requestToken() { return this.availableTokens > 0 ? (this.availableTokens--, true) : false; }
  releaseToken() { this.availableTokens = Math.min(this.maxTokens, this.availableTokens + 1); }
}
```

### 10.2 Geometric Bullet Patterns (Danmaku Trigonometry)
- **Radial Nova**: $\theta_i = \theta_0 + \frac{2\pi i}{N}$.
- **Spiral Stream**: $\theta(t) = \omega t + \frac{2\pi k}{M}$.
- **Targeted Shotgun Fan**: $\theta_k = \theta_{\text{aim}} + (k - \frac{M - 1}{2})\Delta\theta$.

### 10.3 Sensory Perception (Vision Cones & Audio Bubbles)
$$\text{In Sight} \iff \hat{v}_{\text{facing}} \cdot \frac{\vec{x}_p - \vec{x}_{\text{ai}}}{\|\vec{x}_p - \vec{x}_{\text{ai}}\|} \ge \cos\left(\frac{\text{FOV}}{2}\right) \quad \text{and} \quad d \le R_{\text{vision}}$$

### 10.4 Brain State Architectures
- **FSM**: Simple, but state transitions grow quadratically ($O(N^2)$).
- **Behavior Tree**: Hierarchical and structured for squad games.
- **Utility AI (Recommended)**: Multiplies continuous normalized utility scores $U = \prod f_j(x_j)^{w_j}$. Highest score executes dynamically.

---

## 11. Universal Engineering Essentials

### 11.1 Screen-Independent Responsive Scaling
Never hardcode pixel constants. Proportional scaling guarantees identical gameplay across all displays:
```javascript
const D_screen = Math.min(canvas.width, canvas.height);
this.radius  = D_screen * 0.040;        // 4% of viewport
this.vCruise = (0.22 * D_screen) / 60;  // 22% viewport per second
this.vLaser  = (0.85 * D_screen) / 60;  // 85% viewport per second
this.radar   = 6.0 * this.radius;       // 6 body radii
```

### 11.2 The Math Cheatsheet
- **Dot Product**: $\vec{A} \cdot \vec{B} = A_x B_x + A_y B_y$ ($+1$ aligned, $0$ perpendicular, $-1$ opposing).
- **Normal Vector ($90^\circ$ Clockwise)**: $\vec{u}_\perp = [-u_y, u_x]$.
- **Vector Normalization**: $\vec{u} = \vec{v} / (\text{Math.hypot}(v_x, v_y) \parallel 1)$.
- **Standoff Softening**: $\tanh\left(\frac{d - D_{\text{ideal}}}{\sigma}\right)$.

---
---

# PART II: CASE STUDY: THE "SPACESHIP FLIGHT" ENEMY UFO

---

## 12. Saucer Profile: The Orbiting Harasser

In *Spaceship Flight*, the enemy saucer embodies Archetype 3 (The Orbiting Harasser). It weaves smoothly through dense asteroid fields, maintains combat standoff distance, circles the player ship, and challenges player dodging skills without feeling cheap.

```
       [ASTEROID FIELD]                      [TACTICAL ORBIT]
              🪨                                     ╭────────╮
                                               ╭─────╯   🛸   ╰─────╮
         🪨       🛸 (UFO Harasser)            │      (Saucer)      │
                                               │         │          │
              🪨                               │         ▼          │
                                               │      [Player 🚀]   │
                                               ╰────────────────────╯
```

### Production Parameter Tuning
- **Standoff Distance**: $D_{\text{combat}} = 0.40 \times \min(W, H)$
- **Interest Weights**: $w_{\text{player}} = 0.8, w_{\text{flank}} = 0.6, w_{\text{bound}} = 1.2, w_{\text{inertia}} = 0.7$
- **Safety Weight**: $w_{\text{danger}} = 5.0$ (guarantees survival strictly dominates pursuit)
- **Orbit Direction Flip**: Inverts $\text{dir}_{\text{orbit}} \in \{+1, -1\}$ dynamically every 5–8 seconds.

---

## 13. Production Code: The UFO Context Steering Engine

Below is the production JavaScript implementation of `ContextSteeringBrain` operating in our game engine ([game.js](file:///Users/amitjoshi2724/Desktop/Spaceship-Flight/game.js)):

```javascript
class ContextSteeringBrain {
  constructor(numRays = 16) {
    this.numRays = numRays;
    this.currentRayIndex = 0;
    
    // Precompute 16 radial unit vectors (22.5° steps)
    this.rays = [];
    for (let k = 0; k < numRays; k++) {
      const angle = (k * 2 * Math.PI) / numRays;
      this.rays.push({
        index: k,
        angle: angle,
        x: Math.cos(angle),
        y: Math.sin(angle)
      });
    }
  }

  evaluateHeading(ufo, player, obstacles, arenaWidth, arenaHeight) {
    const N = this.numRays;
    const danger = new Float32Array(N);
    const interest = new Float32Array(N);
    const radarRange = Math.max(180, ufo.radius * 8.0);

    // -------------------------------------------------------------
    // STEP 1: DANGER MAP (Dual Kinematic & Proximity Evaluation)
    // -------------------------------------------------------------
    for (const obs of obstacles) {
      if (obs.popped || obs.dead) continue;

      const relX = obs.x - ufo.x;
      const relY = obs.y - ufo.y;
      const dist = Math.hypot(relX, relY);

      if (dist < radarRange + obs.radius) {
        const relVx = (obs.dx || 0) - ufo.dx;
        const relVy = (obs.dy || 0) - ufo.dy;
        const closingSpeed = -(relX * relVx + relY * relVy) / (dist || 1);
        
        // Kinematic time-to-impact urgency
        let urgencyKinematic = 0;
        if (closingSpeed > 0.05) {
          const tImpact = dist / closingSpeed;
          urgencyKinematic = 1.0 / Math.max(0.10, tImpact);
        }

        // Static spatial proximity urgency
        const proximityFactor = Math.max(0, 1.0 - dist / (radarRange + obs.radius));
        const urgencyProximity = proximityFactor * 2.5;

        const urgency = Math.max(urgencyKinematic, urgencyProximity);
        const safeClearance = ufo.radius + obs.radius + ufo.radius * 0.45;

        for (let k = 0; k < N; k++) {
          const ray = this.rays[k];
          const proj = relX * ray.x + relY * ray.y;

          if (proj > -ufo.radius * 0.4 && proj < radarRange) {
            const latDist = Math.hypot(relX - proj * ray.x, relY - proj * ray.y);
            if (latDist < safeClearance) {
              const penetration = 1.0 - (latDist / safeClearance);
              const distanceWeight = Math.max(0.2, 1.0 - Math.max(0, proj) / radarRange);
              danger[k] += urgency * (penetration * penetration) * distanceWeight * 2.5;
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 2: INTEREST MAP (Suppressed Under Imminent Threat)
    // -------------------------------------------------------------
    const pDx = player.x - ufo.x;
    const pDy = player.y - ufo.y;
    const pDist = Math.hypot(pDx, pDy) || 1;
    const uPlayerX = pDx / pDist;
    const uPlayerY = pDy / pDist;

    const orbitDir = ufo.orbitDirection || 1;
    const uPerpX = -uPlayerY * orbitDir;
    const uPerpY =  uPlayerX * orbitDir;

    const margin = Math.min(arenaWidth, arenaHeight) * 0.12;
    let wallX = 0, wallY = 0;
    if (ufo.x < margin) wallX += (margin - ufo.x) / margin;
    if (ufo.x > arenaWidth - margin) wallX -= (ufo.x - (arenaWidth - margin)) / margin;
    if (ufo.y < margin) wallY += (margin - ufo.y) / margin;
    if (ufo.y > arenaHeight - margin) wallY -= (ufo.y - (arenaHeight - margin)) / margin;

    const currentSpeed = Math.hypot(ufo.dx, ufo.dy);
    const vNormX = currentSpeed > 0.1 ? ufo.dx / currentSpeed : this.rays[this.currentRayIndex].x;
    const vNormY = currentSpeed > 0.1 ? ufo.dy / currentSpeed : this.rays[this.currentRayIndex].y;

    const combatRange = Math.min(arenaWidth, arenaHeight) * 0.40;
    const distFactor = Math.tanh((pDist - combatRange) / (arenaWidth * 0.18));

    // Suppress forward inertia bonus when current heading is dangerous
    const currentHeadingDanger = danger[this.currentRayIndex];
    const inertiaWeight = currentHeadingDanger > 0.15 ? 0.0 : 0.7;

    for (let k = 0; k < N; k++) {
      const ray = this.rays[k];
      const I_player   = distFactor * (ray.x * uPlayerX + ray.y * uPlayerY);
      const I_flank    = (ray.x * uPerpX + ray.y * uPerpY);
      const I_boundary = (ray.x * wallX + ray.y * wallY);
      const I_inertia  = (ray.x * vNormX + ray.y * vNormY);

      interest[k] = (
        0.8 * I_player +
        0.6 * I_flank +
        1.2 * I_boundary +
        inertiaWeight * I_inertia
      );
    }

    // -------------------------------------------------------------
    // STEP 3: SCORE EVALUATION & HYSTERESIS
    // -------------------------------------------------------------
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let k = 0; k < N; k++) {
      const score = interest[k] - 5.0 * danger[k];
      if (score > bestScore) {
        bestScore = score;
        bestIndex = k;
      }
    }

    // Responsive Hysteresis: Immediate yielding when danger is ahead
    const currentScore = interest[this.currentRayIndex] - 5.0 * danger[this.currentRayIndex];
    if (bestIndex !== this.currentRayIndex) {
      const hasDangerAhead = danger[this.currentRayIndex] > 0.15;
      const saferAlternative = danger[bestIndex] < danger[this.currentRayIndex];
      const significantlyBetter = bestScore > currentScore + 0.15;

      if (hasDangerAhead || saferAlternative || significantlyBetter) {
        this.currentRayIndex = bestIndex;
      }
    }

    return this.rays[this.currentRayIndex];
  }
}
```

---

## 14. The UFO's Dual-Channel Combat System

```
                         ┌────────────────────────────────────────┐
                         │          UFO Combat Computer           │
                         └───────────────────┬────────────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
       [Offensive Player Laser]                       [Defensive Dual-Sided CIWS]
       - Cooldown: 85–140 frames (~1.4s–2.3s)         - Cooldown: 45 frames (~0.75s)
       - Targets the player rocket                    - Targets imminent asteroid collisions
       - Ventral emitter (+0.0156w, +0.1406h)         - Dual Port/Starboard emitters
       - 50% Emerald Direct / 50% Violet Lead         - Red (Port) / Blue (Starboard)
```

---

### 14.1 Channel 1: Dual-Sided Defensive CIWS (Port Red vs. Starboard Blue)
When an asteroid enters the UFO's defensive perimeter ($d < 160\text{px}$, $v_{\text{closing}} > 0.15\text{ px/frame}$, $t_{\text{impact}} < 1.30\text{s}$), the combat computer evaluates which flank the threat is on:

$$\text{localX} = \text{leadX} \cdot \cos\theta + \text{leadY} \cdot \sin\theta$$

1. **Left Flank Threat ($\text{localX} < 0$) $\implies$ Port Turret**:
   - **Spawn Muzzle**: Left emitter at $(-0.2656w, +0.1094h)$.
   - **Hull Light**: Left Red Light flashes ruby-red (`#ff1744`).
   - **Laser Bolt**: Discharges a Ruby-Red bolt (`#ff1744` / `#ef4444`).
   - **Detonation**: Asteroid pops in a shower of ruby-red spark particles.
2. **Right Flank Threat ($\text{localX} \ge 0$) $\implies$ Starboard Turret**:
   - **Spawn Muzzle**: Right emitter at $(+0.2656w, +0.1094h)$.
   - **Hull Light**: Right Blue Light flashes royal-blue (`#1761f2`).
   - **Laser Bolt**: Discharges a Royal-Blue bolt (`#1761f2`).
   - **Detonation**: Asteroid pops in a shower of royal-blue spark particles.

---

### 14.2 Clarifying Hull Muzzle Location vs. Dynamic Lead Aiming

> [!IMPORTANT]
> **Do not confuse the physical muzzle coordinates with the bullet's flight vector!**

* **Muzzle Coordinate $(-0.2656w, +0.1094h)$**:  
  This is purely the **physical spawn origin $(x_0, y_0)$ on the saucer hull**. It guarantees the laser bolt visually emerges from the red gun aperture on the sprite rather than magically appearing out of the center.
* **Intelligent Aim Vector $(bVx, bVy)$**:  
  The flight direction is **completely dynamic and omnidirectional**. The UFO calculates the asteroid's velocity, solves travel time $t = d / v_{\text{laser}}$, projects future rock coordinates $\vec{x}_{\text{intercept}} = \vec{x}_{\text{rock}} + \vec{v}_{\text{rock}} \cdot t$, and normalizes $(bVx, bVy)$ directly toward that predicted intercept point!

```javascript
// 1. DYNAMIC AIM VECTOR (Calculates where to shoot):
const bulletFlightTime = emergencyRock.dist / this.vLaser;
const leadX = emergencyRock.relX + emergencyRock.rock.dx * bulletFlightTime;
const leadY = emergencyRock.relY + emergencyRock.rock.dy * bulletFlightTime;
const aimDist = Math.hypot(leadX, leadY) || 1;
const bVx = (leadX / aimDist) * this.vLaser; // Bullet velocity X
const bVy = (leadY / aimDist) * this.vLaser; // Bullet velocity Y

// 2. PHYSICAL SPAWN POINT (Where on the hull the laser emerges):
const muzzleX = this.x + (-0.2656 * this.width * cosA - 0.1094 * this.height * sinA);
const muzzleY = this.y + (-0.2656 * this.width * sinA + 0.1094 * this.height * cosA);

// The bullet spawns at (muzzleX, muzzleY), but tracks dynamically along (bVx, bVy)!
ufoBullets.push(new UFOBullet(muzzleX, muzzleY, bVx, bVy, 'rock', 'direct', 'red'));
```

---

### 14.3 Channel 2: Offensive Laser Cannon (50% Emerald Direct / 50% Violet Lead)
The UFO's primary weapon fires at the player with deliberate combat pacing ($1.4\text{s} - 2.3\text{s}$ cooldown), preceded by a 22-frame ($0.35\text{s}$) charging telegraph:

* **🟢 Emerald Green Mode (`#00ff8e`) — 50% of Shots**:
  - **Aim**: Direct tracking of player coordinates.
  - **Telegraph**: Center light glows incandescent emerald green.
  - **Counterplay**: **Keep moving!** The shot hits where you were; maintaining speed guarantees a clean dodge.
* **🟣 Alien Violet Mode (`#c084fc`) — 50% of Shots**:
  - **Aim**: Predictive lead intercept solving future player position.
  - **Telegraph**: Center light glows intense alien violet.
  - **Counterplay**: **Brake, reverse, or cut hard!** The shot leads your trajectory; changing speed or direction makes it fly harmlessly past.

---

## 15. Diegetic Hull Light System (`enemyship.png` Mathematical Mapping)

On the 32×32 enemy saucer sprite (`enemyship.png`), three physical indicator apertures communicate internal AI state:

```
               ┌─────────────[Lavender Cockpit Dome]─────────────┐
               │                                                 │
     [🔴 Left Light]                  [🟢/🟣 Center Light]             [🔵 Right Light]
   (-0.2656w, +0.1094h)             (+0.0156w, +0.1406h)             (+0.2656w, +0.1094h)
    Danger Strobe & Port CIWS         Primary Cannon Telegraph        Danger Strobe & Starboard CIWS
```

| Aperture | Coordinate | Colors & Halos | Triggers & Visual Feedback |
|---|---|---|---|
| **Left Light** | $(-0.2656w, +0.1094h)$ | **🔴 Ruby Red** (`#ff1744`) | **Hazard Strobe**: Flashes with blue on imminent collision.<br>**Port CIWS**: Emits vivid flash when firing defensive red shot on left flank. |
| **Center Light** | $(+0.0156w, +0.1406h)$ | **🟢 Emerald** (`#00ff8e`)<br>**🟣 Violet** (`#c084fc`) | **Direct Aim Telegraph**: 22-frame emerald pulse before direct shot.<br>**Lead Aim Telegraph**: 22-frame violet pulse before predictive shot. |
| **Right Light** | $(+0.2656w, +0.1094h)$ | **🔵 Royal Blue** (`#1761f2`) | **Hazard Strobe**: Flashes with red on imminent collision.<br>**Starboard CIWS**: Emits vivid flash when firing defensive blue shot on right flank. |

---

## 16. UFO Economy & Destruction Rewards (Energy Siphon)

Shooting down an enemy UFO rewards skillful play through score and the **Energy Siphon** system (`applyUFOSiphon()` in [game.js](file:///Users/amitjoshi2724/Desktop/Spaceship-Flight/game.js)):

* **Score Bonus**: **+5 Score Points**.
* **Energy Siphon**: Restores **exactly +10% system energy** across your ship's active modules:
  * **Shared Reactor Mode**: **+10%** battery energy (`energy += 10`).
  * **Shield Charger (Shield-Only) Mode**: **+10%** shield capacitor energy (`shieldEnergy += 10`).
  * **Dual Capacitor Mode**: **+5%** weapon energy and **+5%** shield energy (`energy += 5, shieldEnergy += 5`).

### Tactical Cover Interaction
- **Asteroids as Player Cover**: Offensive UFO lasers aimed at the player are absorbed by intervening asteroids with a small kinetic dust puff (`#94a3b8`), allowing skilled players to use asteroids as shields.
- **Defensive CIWS Interceptions**: When an asteroid closes in on the UFO, its CIWS bolts vaporize the rock with matching red or blue particle explosions, clearing space in dramatic fashion.
