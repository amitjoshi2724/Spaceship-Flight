# The Definitive Arcade Game AI Guide: From Zero to Intelligent Enemies

A practical, no-nonsense engineering guide for building responsive, organic, and intelligent game AIs in 2D arcade games. No academic fluff, no heavy machine learning, and no external libraries required — just pure, high-performance mathematics and physics that run in under 0.1 milliseconds per frame.

---

## Table of Contents
1. [The Golden Rule: The Illusion of Intelligence](#1-the-golden-rule-the-illusion-of-intelligence)
2. [The 3 Paradigms of Arcade AI](#2-the-3-paradigms-of-arcade-ai)
3. [Why Vector Summing Breaks (And How Context Steering Solves It)](#3-why-vector-summing-breaks-and-how-context-steering-solves-it)
4. [Step-by-Step Implementation: Building a Context Steering Brain](#4-step-by-step-implementation-building-a-context-steering-brain)
5. [The Anti-Jitter Playbook (The 4 Layers of Smoothness)](#5-the-anti-jitter-playbook-the-4-layers-of-smoothness)
6. [Combat & Weapons AI (Predictive Aiming & Dual Channels)](#6-combat--weapons-ai-predictive-aiming--dual-channels)
7. [The Math Cheatsheet: Essential Formulas](#7-the-math-cheatsheet-essential-formulas)
8. [Responsive Scaling (Never Hardcode Pixels)](#8-responsive-scaling-never-hardcode-pixels)

---

## 1. The Golden Rule: The Illusion of Intelligence

In video games, **you are not trying to create a sentient being; you are creating an actor that plays a convincing role.**

Players cannot see an AI's internal state. They judge intelligence purely through three observable behaviors:
1. **Decisiveness**: Moving smoothly toward an objective without stuttering or spinning randomly.
2. **Reactivity**: Noticeably changing course when a threat approaches.
3. **Telegraphing**: Giving visual and audible hints right before taking an action (e.g. charging a weapon, banking into a turn).

An AI with 5 lines of code that smooths its turns and telegraphs its shots will feel 10x smarter than a 2,000-line neural network that twitches on every frame.

---

## 2. The 3 Paradigms of Arcade AI

| Level | Technique | Best Used For | Why It Breaks in Complex Games |
|---|---|---|---|
| **Level 1: Direct Heading** | `Math.atan2(pY - y, pX - x)` | Missiles, homing bullets, Pac-Man ghosts | Slams directly into rocks and walls; cannot navigate obstacles. |
| **Level 2: Reynolds Vector Addition** | $\vec{F}_{\text{total}} = \vec{F}_{\text{chase}} + \vec{F}_{\text{avoid}}$ | Simple open-field boids, flocking birds | **Vector Cancellation**: Opposing obstacles cancel out to zero, freezing the AI or pushing it into corners. |
| **Level 3: Context Steering** | Cast $N$ rays, evaluate **Danger Map** vs. **Interest Map**, pick highest net score | Dynamic asteroid fields, space shooters, racing AI | Solves gaps, narrow corridors, and moving hazards automatically. |

---

## 3. Why Vector Summing Breaks (And How Context Steering Solves It)

### The Classical Trap (Vector Addition)
Imagine an enemy trying to chase the player through a narrow gap between two asteroids:
- Rock A pushes the enemy **Right** with force $(+10, 0)$.
- Rock B pushes the enemy **Left** with force $(-10, 0)$.
- Player pulls the enemy **Forward** with force $(0, +5)$.

Summing the forces:
$$\vec{F}_{\text{total}} = (+10, 0) + (-10, 0) + (0, +5) = (0, +5)$$

The lateral repulsion forces completely cancel each other out ($+10 - 10 = 0$). The enemy flies straight forward into the squeeze pinch and slams into the rock boundary. If you add arbitrary `if (dist < 30)` checks, the ship flickers violently between the two objects.

---

### The Solution: Context Steering (The 3 Core Building Blocks)

Instead of forcing all desires into a single summed vector, Context Steering divides the problem into three intuitive, human-like steps:

#### 1. The 16-Ray Compass (Discretizing Options)
Imagine standing on the bridge of the UFO. Around you are 16 windows looking out in a complete circle ($22.5^\circ$ apart: North, North-East, East, etc.).

```
                        0° (North)
                 337.5°     22.5°
             315°                 45°
          292.5°                   67.5°
   (West) 270°          🛸          90° (East)
          247.5°                   112.5°
             225°                 135°
                 202.5°     157.5°
                       180° (South)
```

Every frame, the UFO grades each of those 16 directions on a report card.

#### 2. The Danger Map vs. The Interest Map
- **Danger Map ($D$)**: *"Will something hit me if I go this way?"*  
  For each rock moving towards the UFO, any ray pointing towards that collision path receives a heavy penalty. The closer the time to impact ($1 / t_{\text{impact}}$), the heavier the penalty.
- **Interest Map ($I$)**: *"Where would I LIKE to be?"*  
  - *"Do I want to get within combat range of the player?"* (Ray pointing toward rocket gets a positive score)  
  - *"Do I want to circle around them?"* (Perpendicular flanking rays get bonus points)  
  - *"Am I too close to the screen edge?"* (Inward rays get bonus points)  
  - *"Which way am I already moving?"* (Inertia bonus to keep smooth momentum)

#### 3. Subtract and Pick the Best Window
The UFO subtracts the Danger from the Interest for all 16 directions and simply steers towards the highest-scoring window!
$$\text{Total Score}(k) = \text{Interest}(k) - 3.5 \times \text{Danger}(k)$$

- **If the corridor ahead is clear**, it flies smoothly toward you.
- **If two asteroids squeeze toward it**, the rays pointing at the rocks drop to negative infinity, while the narrow gap between them remains positive — **the UFO naturally threads the needle through the gap without needing any special "gap-detecting" code!**

---

## 4. Step-by-Step Implementation: Building a Context Steering Brain

Here is a clean, dependency-free JavaScript implementation of a 16-ray Context Steering controller that you can drop into any 2D game.

```javascript
class ContextSteeringBrain {
  constructor(numRays = 16) {
    this.numRays = numRays;
    this.currentRayIndex = 0; // Remembers current heading for hysteresis
    
    // Precalculate unit vector rays [cos(θ), sin(θ)]
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

    // -------------------------------------------------------------
    // STEP 1: POPULATE DANGER MAP (Obstacles & Hazards)
    // -------------------------------------------------------------
    for (const obs of obstacles) {
      if (obs.popped || obs.dead) continue;

      const relX = obs.x - ufo.x;
      const relY = obs.y - ufo.y;
      const dist = Math.hypot(relX, relY);

      // Only evaluate obstacles within radar range
      const radarRange = ufo.radius * 6.0 + obs.radius;
      if (dist > radarRange) continue;

      // Calculate time to closest approach (continuous urgency)
      const relVx = (obs.dx || 0) - ufo.dx;
      const relVy = (obs.dy || 0) - ufo.dy;
      const closingSpeed = -(relX * relVx + relY * relVy) / (dist || 1);
      
      let timeToImpact = 5.0; // Default safe buffer
      if (closingSpeed > 0.05) {
        timeToImpact = dist / closingSpeed;
      }
      
      // Continuous urgency: scales inversely with time to impact (never hardcode if dist < X)
      const urgency = 1.0 / Math.max(0.12, timeToImpact);
      const safeClearance = ufo.radius + obs.radius + ufo.radius * 0.35;

      // Project obstacle sphere onto each ray
      for (let k = 0; k < N; k++) {
        const ray = this.rays[k];
        const proj = relX * ray.x + relY * ray.y;

        // If obstacle is in the forward half-space of this ray
        if (proj > -safeClearance) {
          const latDist = Math.hypot(relX - proj * ray.x, relY - proj * ray.y);
          if (latDist < safeClearance) {
            const penetration = 1.0 - (latDist / safeClearance);
            // Danger grows with urgency squared and penetration depth
            danger[k] += urgency * penetration * penetration;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 2: POPULATE INTEREST MAP (Player, Orbiting, Walls, Inertia)
    // -------------------------------------------------------------
    const pDx = player.x - ufo.x;
    const pDy = player.y - ufo.y;
    const pDist = Math.hypot(pDx, pDy) || 1;
    const uPlayerX = pDx / pDist;
    const uPlayerY = pDy / pDist;

    // Perpendicular vector for tactical circling / flanking
    const orbitDir = ufo.orbitDirection || 1; // +1 clockwise, -1 counter-clockwise
    const uPerpX = -uPlayerY * orbitDir;
    const uPerpY =  uPlayerX * orbitDir;

    // Soft wall repellent margins (keep inside screen bounds)
    const margin = Math.min(arenaWidth, arenaHeight) * 0.12;
    let wallX = 0, wallY = 0;
    if (ufo.x < margin) wallX += (margin - ufo.x) / margin;
    if (ufo.x > arenaWidth - margin) wallX -= (ufo.x - (arenaWidth - margin)) / margin;
    if (ufo.y < margin) wallY += (margin - ufo.y) / margin;
    if (ufo.y > arenaHeight - margin) wallY -= (ufo.y - (arenaHeight - margin)) / margin;

    // Current forward velocity normalized (anti-jitter inertia)
    const currentSpeed = Math.hypot(ufo.dx, ufo.dy);
    const vNormX = currentSpeed > 0.1 ? ufo.dx / currentSpeed : this.rays[this.currentRayIndex].x;
    const vNormY = currentSpeed > 0.1 ? ufo.dy / currentSpeed : this.rays[this.currentRayIndex].y;

    // Distance desire curve: chase if far, retreat if too close
    const combatRange = Math.min(arenaWidth, arenaHeight) * 0.40;
    const distFactor = Math.tanh((pDist - combatRange) / (arenaWidth * 0.18));

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
        0.7 * I_inertia
      );
    }

    // -------------------------------------------------------------
    // STEP 3: SCORE EVALUATION & HYSTERESIS SELECTION
    // -------------------------------------------------------------
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let k = 0; k < N; k++) {
      const score = interest[k] - 3.5 * danger[k];
      if (score > bestScore) {
        bestScore = score;
        bestIndex = k;
      }
    }

    // Hysteresis: only switch heading if the new ray is substantially better
    // or if the current heading has become actively dangerous.
    const currentScore = interest[this.currentRayIndex] - 3.5 * danger[this.currentRayIndex];
    if (bestIndex !== this.currentRayIndex) {
      if (bestScore > currentScore + 0.18 || danger[this.currentRayIndex] > 0.8) {
        this.currentRayIndex = bestIndex;
      }
    }

    return this.rays[this.currentRayIndex];
  }
}
```

---

## 5. The Anti-Jitter Playbook: The Secret to Making It Feel "Alive"

The difference between a **"janky math experiment"** and a **"badass enemy"** is 3 simple tricks:

1. **Hysteresis (Stubbornness)**: Don't change direction for a 1% score difference. The new direction must be significantly better ($\Delta > 0.18$), which prevents high-frequency flickering.
2. **Continuous Math over Hardcoded Thresholds**: Never write `if (dist < 100)`. Instead, use smooth curves like $1 / (t_{\text{impact}} + \epsilon)$ or $\tanh(\text{distance})$. Smooth inputs produce smooth behaviors.
3. **Visual Feedback (Telegraphing)**: We added a 0.3s purple dome glow before firing, thruster particle flares during evasive overdrive, and $\pm 15^\circ$ banking tilt when turning. The player's brain interprets these cues as conscious intent.

---

### The 4 Engineering Layers of Smoothness

When developers try to code AI from scratch, their ships often shake, twitch, or spin like a top. Real creatures and vehicles have mass and inertia. Here are the 4 techniques that eradicate jitter completely:

### Layer 1: Directional Inertia Bonus
In your Interest calculation, always reward the direction the AI is *already* traveling:
$$I_{\text{inertia}}(k) = \vec{d}_k \cdot \frac{\vec{v}}{\|\vec{v}\|}$$
Giving this a weight of $0.5$ to $0.8$ acts like aerodynamic stabilization. The AI will naturally prefer to continue on its current flight path unless an obstacle or objective provides a strong reason to turn.

### Layer 2: Switching Hysteresis (Stubbornness)
Never switch directions just because another ray scored $0.001$ points higher. Add a switching threshold $\Delta$:
```javascript
if (bestScore > currentScore + 0.18 || currentDanger > 0.8) {
  this.currentHeading = bestHeading;
}
```
The AI stays committed to its trajectory until the alternative is noticeably better or until danger demands an evasive turn.

### Layer 3: Physical Velocity Damping (No Instant Snapping)
Never directly set an AI's position or velocity:
```javascript
// BAD: Instant snapping creates robotic, jerky motion
this.dx = targetDx;
this.dy = targetDy;

// GOOD: Smooth acceleration over time
this.dx += (targetDx - this.dx) * 0.08;
this.dy += (targetDy - this.dy) * 0.08;
```
This single line introduces simulated mass, momentum, and smooth turning arcs.

### Layer 4: Banking Tilt (Visual Weight)
In 2D top-down games, tilt the sprite slightly based on its horizontal acceleration:
```javascript
const targetBankAngle = Math.max(-15, Math.min(15, this.dx * 3.5));
this.drawAngle += (targetBankAngle - this.drawAngle) * 0.1;
```
When turning left, the ship banks $-15^\circ$; when turning right, it banks $+15^\circ$. It looks handcrafted, even though it's 100% driven by math.

---

## 6. Combat & Weapons AI (Predictive Aiming & Dual Channels)

A great enemy doesn't just navigate; it fights with believable tactics.

### 1. First-Order Predictive Aiming (Lead Targeting)
If an enemy fires directly at where the player is right now, the player will never get hit as long as they are moving.

To calculate where the player **will be** when the laser arrives:
```javascript
// Time for the bullet to travel the current distance
const distance = Math.hypot(player.x - ufo.x, player.y - ufo.y);
const timeToHit = distance / bulletSpeed;

// Predict future position assuming constant velocity
const futureX = player.x + player.dx * timeToHit;
const futureY = player.y + player.dy * timeToHit;

// Fire at predicted coordinate
const aimAngle = Math.atan2(futureY - ufo.y, futureX - ufo.x);
```
> **Pro-Tip for Game Balance**: Give the AI a 50/50 mix:
> - 50% of shots fire with predictive lead aiming.
> - 50% fire directly at the player's current position.
> This forces the player to constantly vary their speed rather than just flying in a circle.

---

### 2. Dual-Channel Weapons Architecture
Never lock an enemy out of defending itself just because it shot at the player!

Separate weapons into two distinct timers:
- **Channel 1: Heavy Primary Cannons** (Interval: ~2.0s). Targets the player. Features a 0.3s glowing telegraph to give the player a fair dodging window.
- **Channel 2: Rapid Point-Defense System** (Interval: ~0.45s). Automatically sweeps for incoming asteroids or missiles in its forward flight path and vaporizes them.

This gives the enemy a living, combat-hardened presence: it fights the environment *with* you while simultaneously hunting you down.

---

## 7. The Math Cheatsheet: Essential Formulas

Keep these handy in every 2D game project:

### 1. Vector Dot Product (Alignment & Projection)
$$\vec{A} \cdot \vec{B} = A_x B_x + A_y B_y$$
- **$+1.0$**: Both vectors point in the exact same direction.
- **$0.0$**: Vectors are perpendicular ($90^\circ$).
- **$-1.0$**: Vectors point in opposite directions ($180^\circ$).

### 2. Normalizing a Vector (Unit Direction)
```javascript
const length = Math.hypot(dx, dy) || 1;
const unitX = dx / length;
const unitY = dy / length;
```

### 3. Perpendicular (Normal) Vector
To get a $90^\circ$ vector (for circling or flanking):
```javascript
// Rotate 90 degrees clockwise:
const perpX = -unitY;
const perpY =  unitX;
```

### 4. Hyperbolic Tangent Curve (Combat Range Softener)
Instead of writing an ugly `if/else` block for distance:
$$f(d) = \tanh\left(\frac{d - D_{\text{ideal}}}{\text{Scale}}\right)$$
- If $d > D_{\text{ideal}}$, returns a positive number (attracted to player).
- If $d < D_{\text{ideal}}$, returns a negative number (repelled from player).
- Smoothly transitions through zero at $D_{\text{ideal}}$.

---

## 8. Responsive Scaling (Never Hardcode Pixels)

Never write pixel constants like `const speed = 5` or `const radar = 200`. On a 4K desktop, 200px is tiny; on a mobile phone, 200px is half the screen.

Always anchor metrics to a screen scale factor:
```javascript
// Base metric: the smaller screen dimension
const D_screen = Math.min(canvas.width, canvas.height);

// Responsive metrics:
this.radius = D_screen * 0.04;          // 4% of screen
this.vCruise = (0.22 * D_screen) / 60;   // Crosses 22% of screen per second
this.vLaser  = (0.85 * D_screen) / 60;   // Crosses 85% of screen per second
this.radar   = 6.0 * this.radius;        // 6x body radius
```
Now, whether your game is running on an iPhone, an iPad, or an ultra-wide gaming monitor, the AI will fly at the exact same proportional speed, dodge at the exact same reaction time, and feel identical across all hardware.
