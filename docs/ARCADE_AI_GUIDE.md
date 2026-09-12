# The Definitive Arcade Game AI Guide: From Zero to Intelligent Enemies

A comprehensive, no-nonsense engineering guide for building responsive, organic, and intelligent game AIs in 2D arcade games. No academic fluff, no heavy machine learning, and no external libraries required — just pure, high-performance mathematics and physics that run in under 0.1 milliseconds per frame.

---

## Architectural Guide Structure

This guide is structured into two distinct, comprehensive divisions:

* **[PART I: THE UNIVERSAL 2D ARCADE AI PLAYBOOK](#part-i-the-universal-2d-arcade-ai-playbook)**  
  Universal algorithms, mathematical formulations, combat kinematics, and game design principles applicable to *any* 2D arcade game, top-down shooter, or dogfighting simulation.
* **[PART II: CASE STUDY: THE "SPACESHIP FLIGHT" ENEMY UFO IMPLEMENTATION](#part-ii-case-study-the-spaceship-flight-enemy-ufo-implementation)**  
  The exact, concrete production implementation of the enemy flying saucer in *Spaceship Flight*: its full JavaScript `ContextSteeringBrain`, dual-channel weapon systems, symmetrical red/blue CIWS turrets, diegetic hull light telegraphs, and energy siphon mechanics.

---

## Table of Contents

### Part I: The Universal 2D Arcade AI Playbook
1. [The Golden Rule: The Illusion of Intelligence](#1-the-golden-rule-the-illusion-of-intelligence)
2. [The 3 Paradigms of Arcade AI](#2-the-3-paradigms-of-arcade-ai)
3. [Why Vector Summing Breaks (And How Context Steering Solves It)](#3-why-vector-summing-breaks-and-how-context-steering-solves-it)
4. [The Mathematical Deep-Dive: Context Steering Formulated in LaTeX](#4-the-mathematical-deep-dive-context-steering-formulated-in-latex)
5. [The Anti-Jitter Playbook: The Secret to Making It Feel "Alive"](#5-the-anti-jitter-playbook-the-secret-to-making-it-feel-alive)
6. [Combat & Weapons AI (Predictive Aiming & Ballistics)](#6-combat--weapons-ai-predictive-aiming--ballistics)
7. [Dynamic Difficulty Adjustment (DDA), Psychology & Weapon Decoupling](#7-dynamic-difficulty-adjustment-dda-psychology--weapon-decoupling)
8. [Advanced Arcade AI Archetypes & Possibilities](#8-advanced-arcade-ai-archetypes--possibilities)
9. [Spatial Awareness: Line-of-Sight & Dynamic Cover Finding](#9-spatial-awareness-line-of-sight--dynamic-cover-finding)
10. [The "AI Director" & Attack Token System (Pacing Control)](#10-the-ai-director--attack-token-system-pacing-control)
11. [Influence Maps: Macro Strategy Meets Micro Steering](#11-influence-maps-macro-strategy-meets-micro-steering)
12. [Geometric Bullet Pattern AI (Danmaku Mathematics)](#12-geometric-bullet-pattern-ai-danmaku-mathematics)
13. [Sensory Perception: Vision Cones & Audio Bubbles](#13-sensory-perception-vision-cones--audio-bubbles)
14. [Brain Architectures: FSMs vs. Behavior Trees vs. Utility Systems](#14-brain-architectures-fsms-vs-behavior-trees--utility-systems)
15. [The Math Cheatsheet: Essential Formulas](#15-the-math-cheatsheet-essential-formulas)
16. [Collision Mathematics: From Naive Center-Dots to Continuous Swept-Capsule (CCD)](#16-collision-mathematics-from-naive-center-dots-to-continuous-swept-capsule-ccd)
    - 16.1 [The Old Basic Collision Math (Discrete Point & Bounding Circle)](#161-the-old-basic-collision-math-discrete-point--bounding-circle)
    - 16.2 [The Two Fatal Flaws: Ghost Margins & Frame Tunneling](#162-the-two-fatal-flaws-ghost-margins--frame-tunneling)
    - 16.3 [The Modern Solution: Continuous Swept-Capsule Detection (CCD)](#163-the-modern-solution-continuous-swept-capsule-detection-ccd)
    - 16.4 [Production Implementation in Spaceship Flight](#164-production-implementation-in-spaceship-flight)
17. [Responsive Scaling (Never Hardcode Pixels)](#17-responsive-scaling-never-hardcode-pixels)

### Part II: Case Study: The "Spaceship Flight" Enemy UFO Implementation
18. [Saucer Profile: The Orbiting Harasser Archetype](#18-saucer-profile-the-orbiting-harasser-archetype)
19. [Production Code: The UFO's JavaScript Context Steering Engine](#19-production-code-the-ufos-javascript-context-steering-engine)
20. [The UFO's Dual-Channel Combat System](#20-the-ufos-dual-channel-combat-system)
    - 20.1 [Channel 1: Symmetrical Dual Port/Starboard CIWS (Red vs. Blue)](#201-channel-1-symmetrical-dual-portstarboard-ciws-red-vs-blue)
    - 20.2 [Clarifying Physical Muzzle Spawn Coordinate vs. Intelligent Dynamic Lead Aiming](#202-clarifying-physical-muzzle-spawn-coordinate-vs-intelligent-dynamic-lead-aiming)
    - 20.3 [Channel 2: Offensive Laser Cannon (50% Emerald Direct / 50% Violet Lead)](#203-channel-2-offensive-laser-cannon-50-emerald-direct--50-violet-lead)
21. [Diegetic Hull Light System (`enemyship.png` Mathematical Mapping)](#21-diegetic-hull-light-system-enemyshippng-mathematical-mapping)
22. [UFO Economy, Destruction Rewards & Tactical Cover](#22-ufo-economy-destruction-rewards--tactical-cover)

---

# PART I: THE UNIVERSAL 2D ARCADE AI PLAYBOOK

---

## 1. The Golden Rule: The Illusion of Intelligence

In video games, **you are not trying to create a sentient being; you are creating an actor that plays a convincing role.**

Players cannot see an AI's internal code or neural weights. They judge intelligence purely through three observable behaviors:
1. **Decisiveness**: Moving smoothly toward an objective without stuttering or spinning randomly.
2. **Reactivity**: Noticeably changing course when a threat approaches.
3. **Telegraphing**: Giving visual and audible hints right before taking an action (e.g. charging a weapon, banking into a turn).

An AI with 5 lines of code that smooths its turns and telegraphs its shots will feel 10x smarter than a 2,000-line neural network that twitches on every frame.

---

---

## 2. The 3 Paradigms of Arcade AI

| Level | Technique | Best Used For | Why It Breaks in Complex Games |
|---|---|---|---|
| **Level 1: Direct Heading** | `Math.atan2(pY - y, pX - x)` | Missiles, homing bullets, Pac-Man ghosts | Slams directly into rocks and walls; cannot navigate obstacles. |
| **Level 2: Reynolds Vector Addition** | $\vec{F}_{\text{total}} = \vec{F}_{\text{chase}} + \vec{F}_{\text{avoid}}$ | Simple open-field boids, flocking birds | **Vector Cancellation**: Opposing obstacles cancel out to zero, freezing the AI or pushing it into corners. |
| **Level 3: Context Steering** | Cast $N$ rays, evaluate **Danger Map** vs. **Interest Map**, pick highest net score | Dynamic asteroid fields, space shooters, racing AI | Solves gaps, narrow corridors, and moving hazards automatically. |

---

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

---

## 4. The Mathematical Deep-Dive: Context Steering Formulated in LaTeX

For developers who prefer mathematical definitions over parsing code, here is the complete mathematical framework of Context Steering.

### 4.1 The Ray Discretization
We discretize continuous 2D space into $N$ candidate direction unit vectors $\hat{d}_k$ for $k \in \{0, 1, \dots, N-1\}$:

$$\theta_k = \frac{2\pi k}{N}, \quad \hat{d}_k = \begin{bmatrix} \cos\theta_k \\ \sin\theta_k \end{bmatrix}$$

For $N = 16$, the angular resolution is $\Delta\theta = 22.5^\circ$.

---

### 4.2 Relative Kinematics & Closing Speed
Let the enemy ship be at position $\vec{x}_{\text{ai}}$ with velocity $\vec{v}_{\text{ai}}$.  
For an obstacle $i$ at position $\vec{x}_i$ with velocity $\vec{v}_i$:

$$\vec{r}_i = \vec{x}_i - \vec{x}_{\text{ai}}, \quad d_i = \|\vec{r}_i\|$$
$$\vec{v}_{\text{rel}, i} = \vec{v}_i - \vec{v}_{\text{ai}}$$

The **closing velocity** $v_{\text{close}, i}$ represents the rate at which the obstacle is radially closing in on the ship:

$$v_{\text{close}, i} = -\frac{\vec{r}_i \cdot \vec{v}_{\text{rel}, i}}{d_i}$$

#### How We Got Here (The Calculus Derivation)
Why is there a negative sign, and why is the dot product divided by $d_i$?
The Euclidean distance $d(t)$ between the two bodies is:
$$d(t) = \|\vec{r}(t)\| = \sqrt{\vec{r}(t) \cdot \vec{r}(t)}$$

Using the chain rule to take the time derivative $\frac{d}{dt} d(t)$ (the rate of change of distance):
$$\frac{d}{dt} d(t) = \frac{1}{2\sqrt{\vec{r} \cdot \vec{r}}} \cdot \frac{d}{dt}(\vec{r} \cdot \vec{r}) = \frac{2\vec{r} \cdot \frac{d\vec{r}}{dt}}{2\|\vec{r}\|} = \frac{\vec{r} \cdot \vec{v}_{\text{rel}}}{d}$$

- If $\frac{d}{dt} d(t) > 0$: distance is growing (the obstacle is moving away).
- If $\frac{d}{dt} d(t) < 0$: distance is shrinking (the obstacle is closing in).

Because we want **closing speed** to be a positive number when danger is increasing, we invert the sign:
$$v_{\text{close}} = -\frac{d}{dt} d(t) = -\frac{\vec{r} \cdot \vec{v}_{\text{rel}}}{d}$$

- If $v_{\text{close}, i} \le 0$: the obstacle is drifting away or moving parallel. No immediate collision.
- If $v_{\text{close}, i} > 0$: the obstacle is actively converging toward the ship.

The **time to impact** $t_{\text{impact}, i}$ is:

$$t_{\text{impact}, i} = \begin{cases} \dfrac{d_i}{v_{\text{close}, i}}, & \text{if } v_{\text{close}, i} > v_{\text{threshold}} \\ \infty, & \text{otherwise} \end{cases}$$

---

### 4.3 Continuous Quadratic Urgency Curve $U(t)$ (Inverse-Square Law)
Instead of step functions or linear curves, physics dictates an **inverse-square urgency curve**:

$$U_i = \frac{1}{\max(\epsilon, t_{\text{impact}, i}^2)}$$

where $\epsilon = 0.04\text{s}^2$ prevents division by zero (equivalent to $t = 0.20\text{s}$).

#### Physical Derivation (Constant-Acceleration Evasion)
Under uniform lateral or braking thruster acceleration $a$, the displacement needed to clear an obstacle within time $t$ is:

$$d = \frac{1}{2} a t^2 \implies a_{\text{required}} = \frac{2d}{t_{\text{impact}}^2}$$

The physical acceleration required to avoid a collision scales with the **inverse square of time** ($1 / t^2$).

#### Comparing Linear ($1/t$) vs. Quadratic ($1/t^2$):
- **Linear ($1/t$)**: At $t = 1.0\text{s}$, $U = 1.0$; at $t = 0.5\text{s}$, $U = 2.0$. The gradient is far too shallow—the AI feels "safe enough" until $t < 0.25\text{s}$, at which point physical inertia makes a crash unavoidable.
- **Quadratic ($1/t^2$)**:
  - At $t = 2.0\text{s}$, $U = 0.25$ (peaceful, ignores distant non-threats).
  - At $t = 1.0\text{s}$, $U = 1.0$ (early gentle course adjustment).
  - At $t = 0.6\text{s}$, $U = 2.78$ (**decisive evasion begins early!**).
  - At $t = 0.35\text{s}$, $U = 8.16$ (massive repulsion spike that instantly crushes interest biases).
  - At $t = 0.20\text{s}$, $U = 25.0$ (emergency thruster overdrive).

---

### 4.4 Ray Projection, Lateral Clearance, and Penetration
For each ray $\hat{d}_k$, we project the relative position $\vec{r}_i$ onto the ray:

$$\text{proj}_{k, i} = \vec{r}_i \cdot \hat{d}_k$$

The obstacle only poses a hazard along ray $\hat{d}_k$ if it lies in the forward half-space: $\text{proj}_{k, i} > -R_{\text{safe}, i}$.

The **lateral (perpendicular) distance** from the ray line to the obstacle center is:

$$d_{\text{lat}}(k, i) = \left\| \vec{r}_i - \text{proj}_{k, i} \hat{d}_k \right\| = \sqrt{d_i^2 - \text{proj}_{k, i}^2}$$

```
                RIGHT TRIANGLE LATERAL PROJECTION
                      Asteroid Center
                            ●
                           ╱│
                          ╱ │
             Vector r_i  ╱  │ d_lat (Perpendicular Distance)
            (Hypotenuse)╱   │
                       ╱    │
                      ●─────┴──────────────► Ray d_k
                     Ship   proj = r · d_k
```

#### How We Got Here (The Pythagorean Theorem)
The vector $\vec{r}_i$ forms the hypotenuse of a right-angled triangle.  
The adjacent leg along the ray has length $\text{proj}_{k, i} = \vec{r}_i \cdot \hat{d}_k$.  
By the Pythagorean theorem:
$$(\text{proj}_{k, i})^2 + (d_{\text{lat}})^2 = \|\vec{r}_i\|^2 = d_i^2$$
Solving for $d_{\text{lat}}$ gives the exact perpendicular distance:
$$d_{\text{lat}}(k, i) = \sqrt{d_i^2 - (\text{proj}_{k, i})^2}$$

The **safety clearance envelope** is:
$$R_{\text{safe}, i} = R_{\text{ai}} + R_{\text{obs}, i} + \text{buffer}$$

The **penetration depth ratio** $P_{k, i} \in [0, 1]$ represents how deeply the ray cuts through the hazard's collision boundary:

$$P_{k, i} = \max\left(0, 1 - \frac{d_{\text{lat}}(k, i)}{R_{\text{safe}, i}}\right)$$

#### 4.4.1 The "Outrunning Trap": Why AIs Try to Outrun Faster Obstacles
A classic flaw in naive raycasting occurs when a fast obstacle is closing **from behind**:
- If the rock is behind the AI ($\vec{r}_i = \vec{x}_{\text{rock}} - \vec{x}_{\text{ai}}$ points backwards), then for any ray $\hat{d}_k$ pointing forwards, $\text{proj}_{k, i} = \vec{r}_i \cdot \hat{d}_k < 0$.
- Static raycasting concludes: *"There is no obstacle ahead on ray $\hat{d}_k$!"*
- Because ray $\hat{d}_k$ matches the AI's current velocity, it receives a $+0.7$ inertia bonus.
- **The AI tries to outrun the asteroid in a straight line.** But if $v_{\text{rock}} > v_{\text{ai}}$, the rock inevitably overtakes and smashes the ship from behind!

#### The Velocity-Obstacle Dynamic Trajectory Solution
For every candidate ray $\hat{d}_k$, evaluate whether traveling along that ray at speed $v_{\text{boost}}$ results in an unavoidable collision with a closing obstacle:

$$\vec{v}_{\text{rel}, k} = \vec{v}_{\text{rock}} - \left(\hat{d}_k \cdot v_{\text{boost}}\right)$$

If $\vec{r}_i \cdot \vec{v}_{\text{rel}, k} < 0$ (the obstacle is closing on the AI along this candidate path), the time of closest approach is:

$$t_{\text{close}} = -\frac{\vec{r}_i \cdot \vec{v}_{\text{rel}, k}}{\|\vec{v}_{\text{rel}, k}\|^2}$$

#### How We Got Here (Finding the Minimum of a Parabola)
At any future time $t$, the relative displacement between the ship and rock along this ray is:
$$\vec{r}(t) = \vec{r}_i + \vec{v}_{\text{rel}, k} \cdot t$$

The squared distance function $f(t) = \|\vec{r}(t)\|^2$ is:
$$f(t) = (\vec{r}_i + \vec{v}_{\text{rel}, k} t) \cdot (\vec{r}_i + \vec{v}_{\text{rel}, k} t) = \|\vec{r}_i\|^2 + 2t(\vec{r}_i \cdot \vec{v}_{\text{rel}, k}) + t^2 \|\vec{v}_{\text{rel}, k}\|^2$$

This is a standard parabola $f(t) = a t^2 + b t + c$ where $a = \|\vec{v}_{\text{rel}, k}\|^2 > 0$.  
To find the minimum distance, take the first derivative with respect to time $t$ and set it to zero:
$$f'(t) = 2(\vec{r}_i \cdot \vec{v}_{\text{rel}, k}) + 2t \|\vec{v}_{\text{rel}, k}\|^2 = 0$$
$$\implies t_{\text{close}} = -\frac{\vec{r}_i \cdot \vec{v}_{\text{rel}, k}}{\|\vec{v}_{\text{rel}, k}\|^2}$$

If $t_{\text{close}} > 0$ and within the evasive horizon ($t < 1.25\text{s}$), the minimum future distance is:

$$d_{\text{min}} = \|\vec{r}_i + \vec{v}_{\text{rel}, k} t_{\text{close}}\|$$

If $d_{\text{min}} < R_{\text{safe}}$, **this ray leads to an unavoidable rear collision**. The ray receives an insurmountable barrier penalty ($-100.0$), forcing the AI to **break laterally/perpendicularly** out of the asteroid's path rather than futilely trying to outpace it!

---

### 4.5 The Danger Map Equation
The total danger score $D(k)$ for ray $k$ sums all threatening obstacles within radar range:

$$D(k) = \sum_{i \in \text{threats}} U_i \cdot \left(P_{k, i}\right)^2$$

*Why quadratic penetration $(P_{k, i})^2$?*  
Rays that barely graze the edge receive a very mild penalty, while rays pointing directly at the obstacle's center suffer a punishing quadratic penalty, leaving clean corridors wide open.

---

### 4.6 The Tactical Interest Map Formulation
The Interest Map balances four distinct tactical drives:

$$I(k) = w_{\text{player}} I_{\text{player}}(k) + w_{\text{flank}} I_{\text{flank}}(k) + w_{\text{bound}} I_{\text{bound}}(k) + w_{\text{inertia}} I_{\text{inertia}}(k)$$

#### 1. Combat Range Desire Curve (Hyperbolic Tangent)
Let $d_p = \|\vec{x}_{\text{player}} - \vec{x}_{\text{ai}}\|$ and let $D_{\text{combat}}$ be the ideal standoff distance:

$$\delta(d_p) = \tanh\left(\frac{d_p - D_{\text{combat}}}{\sigma}\right) \in (-1, 1)$$

##### Why the Hyperbolic Tangent ($\tanh$)?
Why not a simple linear difference $(d_p - D_{\text{combat}})$ or a hard threshold `if (d > D) +1 else -1`?
1. **The Explosion Flaw of Linear Curves**: If the player is on the far opposite side of the screen ($d_p = 1200\text{px}$), a linear difference $(1200 - 300) = +900$ produces an enormous interest score that completely overpowers obstacle avoidance. The AI charges headfirst into asteroids because its player desire is mathematically unbounded.
2. **The Chatter Flaw of Step Functions**: A hard `if/else` flips instantly from $+1.0$ (pursue) to $-1.0$ (retreat) the moment the AI crosses $d = D_{\text{combat}}$. The AI shivers violently back and forth across the boundary on alternate frames.
3. **The Sigmoidal Perfection of $\tanh$**:
   $$\tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}} = \frac{e^{2z} - 1}{e^{2z} + 1}$$
   - **Strictly Bounded**: For any distance, $\delta(d_p)$ is guaranteed to stay strictly within $(-1, +1)$. It can never overpower local collision avoidance.
   - **Smooth Transitions**: At $d_p = D_{\text{combat}}$, $\delta = 0$. In the transition band controlled by $\sigma$, the gradient is smooth and continuous ($\frac{d}{dz}\tanh(z) = 1 - \tanh^2(z)$), letting the AI decelerate gracefully into orbit without twitching.
   - **Saturation**: When far away ($d_p \gg D_{\text{combat}}$), $\delta \to +1.0$ (maximum pursuit drive). When too close ($d_p \ll D_{\text{combat}}$), $\delta \to -1.0$ (maximum kite/retreat drive).

The player interest along ray $k$ is:
$$I_{\text{player}}(k) = \delta(d_p) \cdot \left(\hat{d}_k \cdot \hat{u}_{\text{player}}\right), \quad \text{where } \hat{u}_{\text{player}} = \frac{\vec{x}_{\text{player}} - \vec{x}_{\text{ai}}}{d_p}$$

#### 2. Tangential Flanking / Orbiting
To circle around the player rather than charging head-on in a straight line, we compute the normal vector perpendicular to the player direction:

$$\hat{u}_{\text{perp}} = \text{dir}_{\text{orbit}} \cdot \begin{bmatrix} -\hat{u}_{\text{player}, y} \\ \hat{u}_{\text{player}, x} \end{bmatrix}, \quad \text{dir}_{\text{orbit}} \in \{+1, -1\}$$

##### How We Got Here (The 2D Rotation Matrix)
How does swapping coordinates and negating $y$ produce a mathematically exact $90^\circ$ perpendicular vector?  
Any 2D vector $\vec{v} = [x, y]^T$ rotated by angle $\theta$ is transformed by the standard rotation matrix:
$$R(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}$$

For a counter-clockwise $90^\circ$ ($\pi/2$ radians) rotation:
$$\cos(90^\circ) = 0, \quad \sin(90^\circ) = 1$$
$$R(+90^\circ) \begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} 0\cdot x - 1\cdot y \\ 1\cdot x + 0\cdot y \end{bmatrix} = \begin{bmatrix} -y \\ x \end{bmatrix}$$

For a clockwise $-90^\circ$ rotation:
$$R(-90^\circ) \begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -1 & 0 \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} y \\ -x \end{bmatrix}$$

Notice that multiplying $[-y, x]^T$ by $\text{dir}_{\text{orbit}} \in \{+1, -1\}$ seamlessly inverts between counter-clockwise and clockwise circling with zero trigonometry overhead!

$$I_{\text{flank}}(k) = \hat{d}_k \cdot \hat{u}_{\text{perp}}$$

#### 3. Soft Screen Boundary Cushion
Let the arena dimensions be $(W, H)$ with margin $M = 0.12 \min(W, H)$. The inward boundary repulsion vector $\vec{F}_{\text{bound}}$ is:

$$\vec{F}_{\text{bound}} = \begin{bmatrix} 
\max\left(0, \frac{M - x}{M}\right) - \max\left(0, \frac{x - (W - M)}{M}\right) \\
\max\left(0, \frac{M - y}{M}\right) - \max\left(0, \frac{y - (H - M)}{M}\right)
\end{bmatrix}$$

##### How We Got Here (The Normalized Linear Ramp)
When the ship is in the safe interior ($M \le x \le W - M$), both $\frac{M - x}{M} \le 0$ and $\frac{x - (W - M)}{M} \le 0$. The $\max(0, \cdot)$ clamps them to 0, leaving $\vec{F}_{\text{bound}} = [0, 0]^T$ (zero interference).  
When the ship wanders into the left margin ($x < M$):
$$\frac{M - x}{M} = 1 - \frac{x}{M}$$
- At $x = M$: repulsion $= 0.0$.
- At $x = M/2$: repulsion $= +0.5$ (inward push).
- At $x = 0$ (the physical wall edge): repulsion $= +1.0$ (maximum push back into the arena).

This generates a frictionless, soft spring cushion that gently steers the AI back toward the playfield before it ever touches a screen boundary.

$$I_{\text{bound}}(k) = \hat{d}_k \cdot \vec{F}_{\text{bound}}$$

#### 4. Directional Inertia (Anti-Jitter Stabilization)
Let $\hat{v} = \frac{\vec{v}_{\text{ai}}}{\|\vec{v}_{\text{ai}}\|}$ be the current normalized flight direction:

$$I_{\text{inertia}}(k) = \hat{d}_k \cdot \hat{v}$$

Rewarding rays aligned with the current velocity vector acts like an aerodynamic stabilizer, preventing frame-by-frame flutter.

---

### 4.7 Net Scoring & Responsive Hysteresis
Every ray $k$ receives a net score:

$$S(k) = I(k) - w_d D(k), \quad \text{with strong safety weighting } w_d \approx 5.0$$

The highest-scoring ray is $k^* = \arg\max_k S(k)$.  

#### The Hysteresis Trap & The Solution:
If hysteresis is too stubborn (e.g. demanding $\Delta > 0.18$ even when heading toward a rock), the ship will slam into the obstacle because its forward inertia bonus $+0.7$ artificially inflates the current path's score!

**The Golden Rule of Hysteresis**: *Stubbornness is ONLY for safe cruising; it must INSTANTLY yield when danger is detected.*

$$\text{Active Ray} \leftarrow \begin{cases} 
k^*, & \text{if } D(k_{\text{current}}) > 0.15 \quad \text{(immediate danger ahead)} \\
k^*, & \text{if } D(k^*) < D(k_{\text{current}}) \quad \text{(safer alternative)} \\
k^*, & \text{if } S(k^*) > S(k_{\text{current}}) + 0.15 \quad \text{(significantly better)} \\
k_{\text{current}}, & \text{otherwise (smooth cruising)}
\end{cases}$$

### 4.7 The Imminent Threat Hierarchy (Hard Safety Override)
A classic flaw in naive Context Steering is linear addition/subtraction:

$$S(k) = I(k) - w_d D(k)$$

*Why this fails*: If an asteroid is closing in from an angle, a candidate ray heading towards both the player and the asteroid might have mild danger $D(k) = 0.10$, but high player attraction $I_{\text{player}} = +0.8$. With $w_d = 6.0$, the net score is $+0.8 - 0.60 = \mathbf{+0.20}$. Meanwhile, a completely clear ray ($D = 0$) heading away from the player scores $-0.40$. **The AI chooses to ram into the asteroid because player attraction outweighed the obstacle!**

To eliminate this bug, game AIs implement **Hierarchical Hard Safety Masking**:

1. **Complete Extinguishment of Player Interest**:  
   When any obstacle is on an imminent collision course ($t_{\text{impact}} < 1.6\text{s}$ or $d < 2.8 R_{\text{safe}}$):
   $$w_{\text{player}} = 0.0, \quad w_{\text{flank}} = 0.0, \quad w_{\text{inertia}} = 0.0$$
   The player attraction vector is 100% disabled. The AI does not care about dogfighting while its life is on the line.
2. **Absolute Danger Barrier Penalty**:  
   Any ray with collision danger ($D(k) > 0$) receives an insurmountable barrier penalty:
   $$S(k) = \begin{cases} I_{\text{boundary}}(k), & \text{if } D(k) = 0 \quad \text{(clear ray)} \\ -100.0 - 25.0 \cdot D(k), & \text{if } D(k) > 0 \quad \text{(hazard ray)} \end{cases}$$
   Clear rays always score $\ge -1.6$, while hazard rays plunge below $-100.0$. **No amount of interest can ever cause the AI to choose an asteroid over an open corridor.**

---

### 4.8 Adaptive Velocity Steering: Difficulty-Scaled Agility & Active Retro-Braking
A common failure mode in arcade AI is using a single, high turn agility (e.g. $\alpha = 0.65$) across all scenarios. While this prevents collisions, it produces a **twitchy, jittery AI** that appears to vibrate and accelerate unnaturally.

To achieve organic, grounded flight, turning agility and thruster boost scale **dynamically with difficulty**:

$$\alpha = \begin{cases} 
0.10, & \text{during safe cruising (smooth, cinematic motion)} \\
0.30, & \text{during evasion on Easy mode} \\
0.40, & \text{during evasion on Medium mode} \\
0.50, & \text{during evasion on Hard mode}
\end{cases}$$

$$v_{\text{boost}} = \begin{cases} 
1.25 \cdot v_{\text{cruise}}, & \text{Easy mode evasion} \\
1.40 \cdot v_{\text{cruise}}, & \text{Medium mode evasion} \\
1.55 \cdot v_{\text{cruise}}, & \text{Hard mode evasion}
\end{cases}$$

#### Calibrated Emergency Overdrive (Preventing Premature Panic)
If emergency overdrive triggers on distant or non-threatening asteroids, the enemy will twitch "willy nilly." Evasion overdrive must enforce two strict kinematic gates:
1. **Positive Closing Velocity**: $v_{\text{closing}} > 0.30 \text{ px/frame}$. If an obstacle is drifting away or stationary relative to the ship, never trigger overdrive!
2. **Imminent Collision Window**: $t_{\text{impact}} < 0.70\text{s}$ (or $d < 1.35 R_{\text{clearance}}$ with $t_{\text{impact}} < 1.1\text{s}$).

#### Active Retro-Braking (Momentum Cancellation)
When reversing direction ($\hat{d}^* \cdot \hat{v} < -0.15$) or when boxed in by obstacles:

```javascript
if (isBoxedIn) {
  // Trapped with hazards on all sides: cut forward speed immediately!
  targetSpeed = 0;
  this.dx *= 0.70;
  this.dy *= 0.70;
} else if (isReversing) {
  // Aggressive counter-thrust to cancel old diagonal momentum before flying backwards
  this.dx *= 0.60;
  this.dy *= 0.60;
}
```

This active dampening halts old momentum without wide, sloppy drift arcs, letting the ship redirect cleanly into the open corridor.

---

---

## 5. The Anti-Jitter Playbook: The Secret to Making It Feel "Alive"

The difference between a **"janky math experiment"** and a **"badass enemy"** is 3 simple tricks:

1. **Hysteresis (Stubbornness)**: Don't change direction for a 1% score difference. The new direction must be significantly better ($\Delta > 0.18$), which prevents high-frequency flickering.
2. **Continuous Math over Hardcoded Thresholds**: Never write `if (dist < 100)`. Instead, use smooth curves like $1 / (t_{\text{impact}} + \epsilon)$ or $\tanh(\text{distance})$. Smooth inputs produce smooth behaviors.
3. **Visual Feedback (Telegraphing)**: We added a 0.3s purple dome glow before firing, thruster particle flares during evasive overdrive, and $\pm 15^\circ$ banking tilt when turning. The player's brain interprets these cues as conscious intent.

---

### The 4 Engineering Layers of Smoothness

When developers try to code AI from scratch, their ships often shake, twitch, or spin like a top. Real creatures and vehicles have mass and inertia. Here are the 4 techniques that eradicate jitter completely:

#### Layer 1: Directional Inertia Bonus
In your Interest calculation, always reward the direction the AI is *already* traveling:
$$I_{\text{inertia}}(k) = \hat{d}_k \cdot \frac{\vec{v}}{\|\vec{v}\|}$$
Giving this a weight of $0.5$ to $0.8$ acts like aerodynamic stabilization. The AI will naturally prefer to continue on its current flight path unless an obstacle or objective provides a strong reason to turn.

#### Layer 2: Switching Hysteresis (Stubbornness)
Never switch directions just because another ray scored $0.001$ points higher. Add a switching threshold $\Delta$:
```javascript
if (bestScore > currentScore + 0.18 || currentDanger > 0.8) {
  this.currentHeading = bestHeading;
}
```
The AI stays committed to its trajectory until the alternative is noticeably better or until danger demands an evasive turn.

#### Layer 3: Physical Velocity Damping (No Instant Snapping)
Never directly set an AI's position or velocity:
```javascript
// BAD: Instant snapping creates robotic, jerky motion
this.dx = targetDx;
this.dy = targetDy;

// GOOD: Smooth acceleration over time
this.dx += (targetDx - this.dx) * 0.08;
this.dy += (targetDy - this.dy) * 0.08;
```

##### How We Got Here (The First-Order Low-Pass Filter)
Why does `v += (target - v) * alpha` create smooth, organic motion?  
Rearranging the equation reveals it is an **Exponential Moving Average (EMA)**:
$$v_{t + \Delta t} = (1 - \alpha) v_t + \alpha v_{\text{target}}$$

In Newtonian physics, a spaceship of mass $m$ propelled toward a target velocity against viscous drag $\gamma$ obeys the differential equation:
$$m \frac{dv}{dt} = \gamma (v_{\text{target}} - v(t)) \implies \frac{dv}{dt} = \frac{v_{\text{target}} - v(t)}{\tau}$$
where $\tau = m / \gamma$ is the physical **time constant** (inertia).

Discretizing $\frac{dv}{dt}$ with Forward Euler over frame duration $\Delta t$:
$$\frac{v_{t + \Delta t} - v_t}{\Delta t} = \frac{v_{\text{target}} - v_t}{\tau} \implies v_{t + \Delta t} = v_t + \left(\frac{\Delta t}{\tau}\right) (v_{\text{target}} - v_t)$$

Setting $\alpha = \frac{\Delta t}{\tau}$ yields the exact code:
$$v \leftarrow v + \alpha (v_{\text{target}} - v)$$
- If $\alpha = 1.0$: $\tau = \Delta t$ (zero simulated mass; snaps instantly).
- If $\alpha = 0.08$: $\tau \approx 12.5$ frames ($\approx 0.20\text{s}$ response time; feels weighty and agile).
- The velocity approaches $v_{\text{target}}$ exponentially with half-life $t_{1/2} = \frac{\ln(2)}{\alpha} \approx 8.6$ frames. This single line introduces simulated mass, momentum, and smooth turning arcs.

#### Layer 4: Banking Tilt (Visual Weight)
In 2D top-down games, tilt the sprite slightly based on its horizontal acceleration:
```javascript
const targetBankAngle = Math.max(-15, Math.min(15, this.dx * 3.5));
this.drawAngle += (targetBankAngle - this.drawAngle) * 0.1;
```
When turning left, the ship banks $-15^\circ$; when turning right, it banks $+15^\circ$. It looks handcrafted, even though it's 100% driven by math.

---

---

## 6. Combat & Weapons AI (Predictive Aiming & Ballistics)

A great enemy doesn't just navigate; it fights with believable tactics.

### 6.1 Predictive Lead Targeting in LaTeX

If an enemy fires directly at the player's current position, the laser will miss as long as the player is moving. We must solve for the future intercept coordinate $\vec{x}_{\text{intercept}}$.

#### The First-Order Linear Approximation
Let bullet speed be $v_b$ and player velocity be $\vec{v}_p$. The first-order estimate of travel time assumes distance doesn't change drastically:

$$t_h \approx \frac{\|\vec{x}_p - \vec{x}_{\text{gun}}\|}{v_b}$$

Assuming constant target velocity during flight, the projected intercept point is:

$$\vec{x}_{\text{aim}} = \vec{x}_p + \vec{v}_p \cdot t_h$$

$$\theta_{\text{aim}} = \text{atan2}\left(x_{\text{aim}, y} - y_{\text{gun}}, x_{\text{aim}, x} - x_{\text{gun}}\right)$$

#### The Exact Quadratic Intercept Solution
For high-precision combat, we solve the exact kinematic intercept equation.

```
                    PREDICTIVE INTERCEPT GEOMETRY
                         Target Path
                     P₀ ──────►──────►──────● Target Intercept P(t*)
                      \                     ╱
                       \                   ╱
                        \  Vector r       ╱ Bullet Path
                         \ (Initial)     ╱ (Distance = v_b * t*)
                          \             ╱
                           \           ╱
                            ●─────────╯
                            Gun Position
```

##### 1. Physical Setup
At any future time $t$, the target's position will be:
$$\vec{x}_p(t) = \vec{x}_p + \vec{v}_p t$$

Meanwhile, a laser fired from the gun at speed $v_b$ expands outward as a sphere of radius $R(t) = v_b t$.  
For an intercept to occur at time $t$, the distance from the gun to the target must equal the bullet's travel distance:
$$\|\vec{x}_p(t) - \vec{x}_{\text{gun}}\| = v_b t$$

##### 2. Vector Algebraic Expansion (Step-by-Step)
Let $\vec{r} = \vec{x}_p - \vec{x}_{\text{gun}}$ be the initial displacement vector from gun to target.  
Substitute $\vec{r}$ into the equation:
$$\|\vec{r} + \vec{v}_p t\| = v_b t$$

Square both sides to eliminate the square root inside the norm $\|\cdot\|$:
$$\|\vec{r} + \vec{v}_p t\|^2 = (v_b t)^2$$

Expand the squared vector norm using the vector dot product:
$$(\vec{r} + \vec{v}_p t) \cdot (\vec{r} + \vec{v}_p t) = v_b^2 t^2$$
$$(\vec{r} \cdot \vec{r}) + 2t (\vec{r} \cdot \vec{v}_p) + t^2 (\vec{v}_p \cdot \vec{v}_p) = v_b^2 t^2$$

##### 3. Grouping into Quadratic Form $A t^2 + B t + C = 0$
Collect all terms on the left side:
$$\Big[(\vec{v}_p \cdot \vec{v}_p) - v_b^2\Big] t^2 + \Big[2(\vec{r} \cdot \vec{v}_p)\Big] t + (\vec{r} \cdot \vec{r}) = 0$$

This is the standard quadratic equation $A t^2 + B t + C = 0$, where:
- $A = \|\vec{v}_p\|^2 - v_b^2 = (v_{p, x}^2 + v_{p, y}^2) - v_b^2$
- $B = 2(\vec{r} \cdot \vec{v}_p) = 2(r_x v_{p, x} + r_y v_{p, y})$
- $C = \|\vec{r}\|^2 = r_x^2 + r_y^2$

##### 4. Solving with the Discriminant $\Delta = B^2 - 4AC$
- **If $\Delta < 0$**: The square root $\sqrt{\Delta}$ is imaginary. No real intercept time exists (the player is outrunning the bullet or flying away too fast). In this case, fall back to the first-order approximation or shoot directly at the player.
- **If $A = 0$**: The player speed exactly equals bullet speed ($\|\vec{v}_p\| = v_b$). The equation reduces to a linear equation $B t + C = 0 \implies t^* = -C / B$.
- **If $\Delta \ge 0$**: The quadratic formula gives two mathematical roots:
  $$t = \frac{-B \pm \sqrt{\Delta}}{2A}$$
  *Why two roots?* Geometrically, the target's trajectory line intersects the expanding bullet sphere twice: once upon entry, and once upon exit.  
  We want the **earliest positive time** ($t > 0$) so the bullet hits the target on entry:
  $$t^* = \min\left(\{t > 0 \mid A t^2 + B t + C = 0\}\right)$$

Once $t^*$ is found, the predicted target position is $\vec{x}_{\text{aim}} = \vec{x}_p + \vec{v}_p t^*$, and the firing angle is simply $\text{atan2}(y_{\text{aim}} - y_{\text{gun}}, x_{\text{aim}} - x_{\text{gun}})$.

---

### 6.2 The Unified Tactical Weapon (Defend vs. Attack Opportunity Cost)

In classic arcade design, giving an enemy two separate independent guns (one for shooting the player and one rapid-fire gun for shooting rocks) easily breaks the game: the enemy becomes an automated vacuum cleaner that nukes asteroids and helps the player.

A far more intelligent, logical, and elegant design is the **Single Unified Tactical Weapon**:

```
                       ┌─────────────────────────┐
                       │  UFO LASER READY TO FIRE │
                       └────────────┬────────────┘
                                    │
                    Is an asteroid on an imminent,
                    unavoidable collision course?
                               /         \
                             YES          NO
                             /             \
       [DEFENSIVE EMERGENCY SHOT]       [OFFENSIVE HUNTER SHOT]
       Blasts asteroid to survive       Fires at player rocket
       (Sacrifices attack round)        (50% direct, 50% lead intercept)
                             \             /
                              ▼           ▼
                       [FULL RELOAD COOLDOWN (~2.0s)]
```

#### Why This Creates High-Level Gameplay:
1. **Opportunity Cost**: If the UFO shoots a rock to save its life, its gun goes on full cooldown! It cannot shoot the player until it reloads.
2. **Player Strategy (Baiting)**: The player can intentionally maneuver so that asteroids crowd the UFO, **forcing the UFO to waste its laser defending itself**, which opens a 2-second vulnerability window for the player to dive in and destroy it!
3. **No Screen Clearing**: Because the UFO only fires once every ~2 seconds, it will never act as a rock exterminator for the player. 95%+ of the time, it must rely purely on its **Context Steering dodging maneuvers** to survive.

---

---

## 7. Dynamic Difficulty Adjustment (DDA), Psychology & Weapon Decoupling

The mark of a master game designer is making the player feel **challenged and thrilled**, never frustrated or cheated.

### 1. The Human Reaction Delay (Ring Buffer)
A computer can read the player's coordinates at 60fps and react in $0.016\text{s}$. If an AI reacts this fast, it feels unfair and robotic.

Human arcade players take **$200\text{ms}$ to $350\text{ms}$** to react to a sudden turn. To make an AI feel organic, store the player's positions in a 15-frame ring buffer:
```javascript
// Store history: [frame-15, frame-14, ... frame-0]
this.playerHistory.push({ x: player.x, y: player.y, dx: player.dx, dy: player.dy });
if (this.playerHistory.length > 15) this.playerHistory.shift();

// AI tracks where the player WAS 250ms ago:
const perceivedPlayer = this.playerHistory[0];
```
Now, when the player hits the reverse thrusters, the AI overshoots for a split second before correcting its course — exactly like a human dogfighter!

### 2. The Inaccuracy Gaussian Cone (Box-Muller Transform)
Never give an enemy 100% laser accuracy (aimbot precision feels unfair and robotic). Instead, add an angular noise offset sampled from a normal distribution:

$$\theta_{\text{fire}} = \theta_{\text{aim}} + \Delta\theta, \quad \Delta\theta \sim \mathcal{N}(0, \sigma^2)$$

Where the standard deviation $\sigma$ adapts to difficulty:
- **Easy difficulty**: $\sigma = 11.5^\circ$ (shots fly visibly wide, creating forgiving dogfights).
- **Medium difficulty**: $\sigma = 7.5^\circ$ (tight near-misses that graze the cockpit by 15–30 pixels).
- **Hard difficulty**: $\sigma = 4.5^\circ$ (disciplined sniper fire that rewards sudden maneuvers).

#### How We Got Here (Derivation of the Box-Muller Transform)
Browsers provide `Math.random()`, which produces a **flat (uniform) distribution** across $[0, 1)$. But human ballistics and dogfight errors follow a **bell curve** (Gaussian normal distribution), where most shots cluster tightly around the bullseye and extreme misses are rare.

How do you turn two flat random numbers $u_1, u_2 \in (0, 1)$ into an exact Gaussian bell curve?

1. **The 2D Gaussian Joint Density**:  
   If we pick two independent Gaussian random coordinates $Z_0, Z_1 \sim \mathcal{N}(0, 1)$, their joint probability density function is:
   $$p(z_0, z_1) = \left(\frac{1}{\sqrt{2\pi}} e^{-z_0^2/2}\right) \left(\frac{1}{\sqrt{2\pi}} e^{-z_1^2/2}\right) = \frac{1}{2\pi} e^{-(z_0^2 + z_1^2)/2}$$

2. **Switching from Cartesian to Polar Coordinates**:  
   Substitute $z_0 = R \cos\theta$ and $z_1 = R \sin\theta$, where $R^2 = z_0^2 + z_1^2$. The differential area element transforms as $dz_0 dz_1 = R \, dR \, d\theta$:
   $$p(R, \theta) \, dR \, d\theta = \left(\frac{1}{2\pi} d\theta\right) \left(R e^{-R^2/2} dR\right)$$
   Notice how this cleanly separates into two independent, solvable single-variable distributions:
   - **The Angle $\theta$**: Uniformly distributed over the circle $[0, 2\pi]$:
     $$\theta = 2\pi u_2$$
   - **The Radius $R$**: The cumulative distribution function of $R$ is:
     $$F(R) = \int_0^R r e^{-r^2/2} dr = \left[ -e^{-r^2/2} \right]_0^R = 1 - e^{-R^2/2}$$

3. **Inverting the Cumulative Distribution**:  
   Set $F(R) = 1 - u_1$ and solve for $R$:
   $$1 - e^{-R^2/2} = 1 - u_1 \implies e^{-R^2/2} = u_1 \implies -\frac{R^2}{2} = \ln(u_1) \implies R = \sqrt{-2\ln(u_1)}$$

4. **Converting Back to Cartesian**:  
   $$Z_0 = R \cos\theta = \sqrt{-2\ln(u_1)} \cos(2\pi u_2)$$
   $$Z_1 = R \sin\theta = \sqrt{-2\ln(u_1)} \sin(2\pi u_2)$$

$Z_0$ is a mathematically exact, pure standard normal variable $\mathcal{N}(0, 1)$!

In JavaScript:
```javascript
// Sample standard normal Z_0 ~ N(0, 1):
const u1 = Math.max(1e-6, Math.random());
const u2 = Math.random();
const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

// Scale by difficulty standard deviation and clamp outliers:
const angleOffset = Math.max(-2.2 * sigmaRad, Math.min(2.2 * sigmaRad, z0 * sigmaRad));
const aimAngle = Math.atan2(aimY, aimX) + angleOffset;
```

### 3. The "Near-Miss" Thrill Effect
Players don't get adrenaline rushes when enemies miss by half the screen. They get thrills when enemy lasers **whiz past their cockpit by 10–20 pixels**.

By tuning the inaccuracy cone so bullets narrowly miss the player's bounding box, players feel like skilled escape artists without realizing the AI was intentionally giving them a close shave.

### 4. The Dual-Channel Weapon Architecture: Decoupling Combat from Survival
Attempting to force a single weapon to serve both offensive player combat and defensive obstacle survival creates an insoluble design conflict:
- If cooldown is fast enough to blast asteroid swarms (~0.5s), the AI unleashes an oppressive bullet-hell on the player.
- If cooldown is slow enough for fair dogfights (~2.0s), the AI gets crushed whenever two rocks approach in sequence.

```
                     ┌────────────────────────────────────────┐
                     │          UFO Combat Computer           │
                     └───────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   [Offensive Player Laser]                       [Defensive CIWS Point-Defense]
   - Cooldown: 121–200 frames (~2.0s - 3.3s)      - Cooldown: 32–52 frames (~0.5s - 0.8s)
   - Long-range player hunting                    - Extended radar bubble (d <= 220px)
   - Gaussian spread (sigma = 7.5 deg)            - True radial collision check (t_impact < 1.3s)
   - Green muzzle flare telegraph (22 frames)     - Predictive intercept lead targeting
   - Emerald plasma bolt (#00ff8e)                - Electric cyan plasma bolt (#38bdf8)
   - Fair & fun dogfight pacing                   - Emergency quick-draw override (12 frames)
```

#### The "Units & Projected Ray" Pitfalls in Point-Defense
Two critical architectural bugs frequently paralyze defensive weapon systems:

1. **The Frames vs. Seconds Units Trap**:  
   If relative closing speed $v_{\text{closing}}$ is measured in $\text{px/frame}$, then $t_{\text{impact}} = \text{dist} / v_{\text{closing}}$ is in **frames** ($\sim 20$ to $60$). If your code checks `if (t_impact < 0.90)`, it is checking if impact is less than **0.90 frames (15ms)**! The weapon will never fire! Always convert to seconds: $t_{\text{impact}} = \frac{\text{dist}}{v_{\text{closing}} \times 60}$.
2. **The "Projected Ray" Blinder**:  
   Targeting obstacles projected onto the current steering heading (`chosenRay`) causes the AI to ignore rocks closing from the flanks or rear. If a rock is barreling in from behind or from a flank, the steering system has already chosen an evasive heading pointing away. Because the rock is now perpendicular or behind the *new heading*, $\text{proj} \le 0$! The AI concludes there is no emergency on its flight path, fires an offensive shot at the player, and gets crushed by the asteroid 10 frames later!
3. **Predictive Intercept Leading**:  
   Shooting at the rock's current position causes bullets to trail behind fast-moving asteroids. The weapon must project the rock's future position during bullet flight time:
   $$t_{\text{flight}} = \frac{d}{v_{\text{laser}}}, \quad \vec{x}_{\text{target}} = \vec{x}_{\text{rock}} + \vec{v}_{\text{rock}} \cdot t_{\text{flight}}$$

**The Golden Rule of Defensive CIWS**: *Point-defense must evaluate true radial kinematics relative to the ship's physical center ($d < R_{\text{bubble}}$ and $t_{\text{impact}} < t_{\text{danger}}$), completely independent of steering direction.*

---

---

## 8. Advanced Arcade AI Archetypes & Possibilities

By simply changing the interest weights $w_p, w_f, w_d, w_i$ and the distance curve, you can create a diverse zoo of completely unique enemy behaviors using the exact same Context Steering engine:

```
                                  [CONTEXT STEERING ENGINE]
                                             │
      ┌─────────────────┬────────────────────┼───────────────────┬────────────────┐
      ▼                 ▼                    ▼                   ▼                ▼
[1. The Berserker] [2. The Sniper]  [3. The Harasser]   [4. The Swarm]    [5. The Escort]
 (Pure Aggression)  (Coward/Kite)     (Orbit & Weave)   (Wolfpack Flocking) (VIP Bodyguard)
```

### Archetype 1: The Berserker / Rammer
- **Personality**: Aggressive, suicidal, charges with reckless abandon.
- **Tuning**:
  - $w_{\text{player}} = 2.5$ (constant forward pull toward player; ignore $\tanh$ standoff).
  - $w_{\text{danger}} = 1.0$ (minimal fear of rocks; only dodges at the very last millisecond).
  - $w_{\text{inertia}} = 1.4$ (high forward thrust; charges like a freight train).
  - $w_{\text{flank}} = 0.0$ (never circles; direct linear pursuit).

### Archetype 2: The Sniper / Coward (Kiter)
- **Personality**: Skulks in the background, flees whenever the player approaches, and snipes from long range.
- **Tuning**:
  - $D_{\text{combat}} = 0.70 \min(W, H)$ (very long standoff distance).
  - $w_{\text{player}} = 1.8$ (heavily repelled if player closes within standoff distance).
  - $w_{\text{danger}} = 4.5$ (extreme hazard aversion; avoids even distant rocks).
  - Weapon: 100% quadratic predictive lead aiming with high laser velocity.

### Archetype 3: The Orbiting Harasser (Our Evil UFO)
- **Personality**: Graceful, tactical, dances through asteroid belts while picking you apart.
- **Tuning**:
  - $D_{\text{combat}} = 0.40 \min(W, H)$ (medium range).
  - $w_{\text{player}} = 0.8, \quad w_{\text{flank}} = 0.6, \quad w_{\text{danger}} = 3.5, \quad w_{\text{inertia}} = 0.7$.
  - Periodically flips $\text{dir}_{\text{orbit}}$ every 5–8 seconds to reverse circling direction.

### Archetype 4: The Wolfpack / Swarm (Flocking Context Steering)
- **Personality**: 3 to 5 small fighters that fly together in formation without crashing into one another.
- **How to Build It**:
  In Step 1 (Danger Map), treat **other friendly ships** as soft obstacle spheres:
  $$R_{\text{separation}} = 2.5 \cdot R_{\text{ship}}$$
  If a squadmate is too close, rays pointing toward that squadmate receive a Danger penalty.
  - **Result**: The pack naturally fans out, encircles the player in a pincer formation, and never clumps or clips into each other!

### Archetype 5: The Bodyguard / Shield-Bearer
- **Personality**: Protects a larger Mother-ship or Boss from incoming player fire.
- **How to Build It**:
  Instead of tracking the player directly, calculate the midpoint between the Boss and the Player:
  $$\vec{x}_{\text{guard}} = \vec{x}_{\text{boss}} + 0.35 (\vec{x}_{\text{player}} - \vec{x}_{\text{boss}})$$
  Set $I_{\text{player}}$ to track $\vec{x}_{\text{guard}}$. The ship will actively position its hull between the player's cannons and the boss!

---

---

## 9. Spatial Awareness: Line-of-Sight & Dynamic Cover Finding

Smart enemies don't just shoot blindly or run away in empty space; they **use the environment as armor**.

```
[Player 🚀] ─── (Laser Fire) ───►  [Asteroid 🪨]  ◄── [Hiding UFO 🛸]
                                  (Shadow Zone)
```

### 9.1 The Line-of-Sight (LoS) Ray-Circle Test in LaTeX
To determine if an asteroid at $\vec{x}_{\text{rock}}$ with radius $R$ blocks the enemy $\vec{x}_{\text{ai}}$ from seeing the player $\vec{x}_p$:

```
                  LINE-OF-SIGHT RAY-CIRCLE GEOMETRY
                               Asteroid (x_rock, R)
                                      ╭───╮
                                      │ ● │
                                      ╰─┬─╯
                                        │
                                        │ d_⊥ (Perpendicular Distance)
                         Vector r       │
    Enemy (x_ai) ●──────────────────────┴───────────────► Player (x_p)
                 ╰─────── t_proj ───────╯
                 ╰──────────────── d_LoS ───────────────╯
```

##### 1. Physical Setup
Let the line-of-sight vector from the enemy to the player be:
$$\vec{L} = \vec{x}_p - \vec{x}_{\text{ai}}, \quad \hat{u}_L = \frac{\vec{L}}{\|\vec{L}\|}, \quad d_{\text{LoS}} = \|\vec{L}\|$$

Let the displacement vector from the enemy to the asteroid center be:
$$\vec{r} = \vec{x}_{\text{rock}} - \vec{x}_{\text{ai}}$$

##### 2. Vector Projection (Parallel Component Along Sightline)
We decompose $\vec{r}$ into parallel and perpendicular components:
$$\vec{r} = \vec{r}_{\parallel} + \vec{r}_{\perp}$$

The scalar projection of the asteroid's center onto the sightline is:
$$t_{\text{proj}} = \vec{r} \cdot \hat{u}_L$$
$$\vec{r}_{\parallel} = t_{\text{proj}} \hat{u}_L$$

##### 3. The Betweenness Condition
The asteroid can only block line-of-sight if its closest approach lies strictly between the enemy and the player:
$$0 < t_{\text{proj}} < d_{\text{LoS}}$$
- If $t_{\text{proj}} \le 0$: the asteroid is behind the enemy.
- If $t_{\text{proj}} \ge d_{\text{LoS}}$: the asteroid is behind the player.
In both cases, it cannot obstruct the line-of-sight.

##### 4. Vector Rejection & Perpendicular Distance (Pythagorean Theorem)
The vector perpendicular from the sightline to the asteroid center (vector rejection) is:
$$\vec{r}_{\perp} = \vec{r} - \vec{r}_{\parallel} = \vec{r} - t_{\text{proj}} \hat{u}_L$$

Because $\vec{r}_{\parallel}$ and $\vec{r}_{\perp}$ form a right-angled triangle with hypotenuse $\vec{r}$:
$$\|\vec{r}\|^2 = \|\vec{r}_{\parallel}\|^2 + \|\vec{r}_{\perp}\|^2 = t_{\text{proj}}^2 + d_{\perp}^2$$
Solving for the perpendicular distance $d_{\perp}$:
$$d_{\perp} = \sqrt{\|\vec{r}\|^2 - t_{\text{proj}}^2}$$

##### 5. The Occlusion Condition
The rock blocks line-of-sight if and only if the laser beam passes within the combined radius of the rock and laser beam buffer:
$$\text{Line of Sight is BLOCKED} \iff (0 < t_{\text{proj}} < d_{\text{LoS}}) \quad \text{AND} \quad \left(d_{\perp} < R_{\text{rock}} + R_{\text{buffer}}\right)$$

---

### 9.2 Dynamic Cover Point Generation

```
                     DYNAMIC SHADOW CONE COVER GEOMETRY
                                               ╭──────────────────────────
                                              ╱  SAFE SHADOW CONE
                                             ╱   (Laser Fire Blocked)
      Player (x_p)         Asteroid (x_rock)╱
           ● ────────────►       ╭───╮     ╱       ● Cover Point (x_cover)
              Vector S           │ 🪨 │────► u_shadow
                                 ╰───╯     ╲
                                            ╲
                                             ╲──────────────────────────
```

When an enemy is under fire or recharging shields, it actively seeks **hard cover** behind an asteroid.

##### 1. Calculating the Shadow Direction
The threat vector radiating outward from the player to the rock center is:
$$\vec{S} = \vec{x}_{\text{rock}} - \vec{x}_p$$

The unit shadow vector pointing directly behind the rock away from the player is:
$$\hat{u}_{\text{shadow}} = \frac{\vec{S}}{\|\vec{S}\|} = \frac{\vec{x}_{\text{rock}} - \vec{x}_p}{\|\vec{x}_{\text{rock}} - \vec{x}_p\|}$$

##### 2. Projecting the Safe Hull Standoff
To ensure the entire enemy ship hull is safely tucked inside the occluded shadow zone (not clipping into the rock or poking out into the line of fire):
$$\vec{x}_{\text{cover}} = \vec{x}_{\text{rock}} + (R_{\text{rock}} + R_{\text{ai}} + \text{buffer}) \cdot \hat{u}_{\text{shadow}}$$

Where:
- $R_{\text{rock}}$: Clears the physical asteroid surface.
- $R_{\text{ai}}$: Accounts for the enemy's physical collision radius.
- $\text{buffer} \approx 15\text{px}$: Safety cushion preventing thruster scrape.

##### 3. Tactical Injection
By injecting $\vec{x}_{\text{cover}}$ into the Interest Map as an attraction goal:
$$I_{\text{cover}}(k) = \hat{d}_k \cdot \frac{\vec{x}_{\text{cover}} - \vec{x}_{\text{ai}}}{\|\vec{x}_{\text{cover}} - \vec{x}_{\text{ai}}\|}$$
The AI naturally sprints behind the nearest asteroid, breaks line-of-sight, and holds position until shields or offensive weapons are ready to re-engage!

---

---

## 10. The "AI Director" & Attack Token System (Pacing Control)

If you spawn 6 enemies on screen and each runs its own combat loop independently, they will eventually all fire at the exact same millisecond. The player gets vaporized by an undodgeable wall of 12 lasers, feels cheated, and uninstalls the game.

To solve this, classic games (from *DOOM* to *Left 4 Dead* and *God of War*) use an **AI Director with an Attack Token Bucket**.

```
                   ┌────────────────────────────┐
                   │   AI DIRECTOR TOKEN POOL   │
                   │    [🪙 Token 1] [🪙 Token 2]│
                   └──────────────┬─────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[🛸 UFO A: Holds Token 1]                         [🛸 UFO B: Holds Token 2]
    *Attacks with lasers*                             *Fires predictive shot*
         │                                                 │
[🛸 UFO C: Waiting in Queue]                     [🛸 UFO D: Waiting in Queue]
    *Flanks, circles, taunts*                         *Weaves through rocks*
```

### How to Implement in 20 Lines of Code:
```javascript
class AIDirector {
  constructor(maxConcurrentAttackers = 2) {
    this.maxTokens = maxConcurrentAttackers;
    this.availableTokens = maxConcurrentAttackers;
  }

  requestAttackToken(enemy) {
    if (this.availableTokens > 0) {
      this.availableTokens--;
      return true; // Granted permission to fire!
    }
    return false; // Denied: must posture and flank instead
  }

  releaseAttackToken(enemy) {
    this.availableTokens = Math.min(this.maxTokens, this.availableTokens + 1);
  }
}
```
- **The Psychology**: The screen is full of 6 menacing enemies, creating the feeling of an overwhelming armada. But because only 2 are shooting while the other 4 are tactically circling, the player always has an escape lane.

---

---

## 11. Influence Maps: Macro Strategy Meets Micro Steering

Context Steering is a **microscopic** navigation system (it dodges a rock 40 pixels ahead). But how does an AI make **macroscopic decisions**, like:
- *"Which quadrant of the arena has the least clutter?"*
- *"Where is the player trapped?"*
- *"Where should I retreat to recover?"*

This is solved with an **Influence Map** (a low-resolution 2D heatmap).

```
[High Danger Zone (Player & Lasers)]  ──►  [Safe Extraction Zone (Cold)]
       🟥 🟥 🟧 🟨 🟩 🟦                          🟦 🟦 🟦 🟦 🟦 🟦
       🟥 🟥 🟧 🟨 🟩 🟦                          🟦 🟦 🟦 🟦 🟦 🟦
```

### 11.1 The Mathematical Diffusion Equation
Divide the arena into an $M \times N$ grid of discrete cells (e.g. $24 \times 16$ cells) with cell spacing $h$.  
Every frame, obstacles, player threats, and power-ups stamp influence onto the grid, which diffuses outward like physical heat:

$$I_{x, y}(t + \Delta t) = (1 - \lambda) I_{x, y}(t) + \frac{\lambda}{4} \sum_{(i, j) \in \text{neighbors}} I_{i, j}(t)$$

where $\lambda \in (0, 1)$ is the diffusion rate.

#### How We Got Here (The 2D Heat/Diffusion PDE Derivation)
In continuous physics, heat or chemical concentration $I(x, y, t)$ diffuses according to Fourier's Law and Fick's Second Law, expressed by the **2D Heat Equation**:

$$\frac{\partial I}{\partial t} = \kappa \nabla^2 I = \kappa \left( \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2} \right)$$

where $\kappa$ is the thermal conductivity (diffusion coefficient) and $\nabla^2$ is the Laplace operator.

##### 1. Discretizing the Spatial Derivatives (Finite Difference)
Using Taylor series expansions, the second spatial derivative in $x$ on a grid with cell size $h$ is approximated by the second-order central difference:
$$\frac{\partial^2 I}{\partial x^2} \approx \frac{I(x + h, y) - 2I(x, y) + I(x - h, y)}{h^2}$$
Similarly, for the $y$ dimension:
$$\frac{\partial^2 I}{\partial y^2} \approx \frac{I(x, y + h) - 2I(x, y) + I(x, y - h)}{h^2}$$

##### 2. The 5-Point Discrete Laplacian Stencil
Summing both directions gives the discrete 2D Laplacian operator:
$$\nabla^2 I = \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2} \approx \frac{1}{h^2} \left[ I(x+h, y) + I(x-h, y) + I(x, y+h) + I(x, y-h) - 4I(x, y) \right]$$

Let $\sum_{\text{neighbors}} I_{\text{neighbor}}$ denote the sum of the 4 orthogonal cardinal neighbors (East, West, North, South):
$$\nabla^2 I \approx \frac{1}{h^2} \left[ \sum_{\text{neighbors}} I_{\text{neighbor}} - 4I(x, y) \right]$$

##### 3. Forward Euler Time Integration
Approximating the time derivative $\frac{\partial I}{\partial t} \approx \frac{I(t + \Delta t) - I(t)}{\Delta t}$:
$$\frac{I(t + \Delta t) - I(t)}{\Delta t} = \frac{\kappa}{h^2} \left[ \sum_{\text{neighbors}} I_{\text{neighbor}} - 4I(x, y) \right]$$

Multiply both sides by $\Delta t$ and group terms:
$$I(t + \Delta t) = I(x, y, t) + \frac{\kappa \Delta t}{h^2} \sum_{\text{neighbors}} I_{\text{neighbor}} - \frac{4\kappa \Delta t}{h^2} I(x, y, t)$$
$$I(t + \Delta t) = \left( 1 - \frac{4\kappa \Delta t}{h^2} \right) I(x, y, t) + \frac{4\kappa \Delta t}{h^2} \left( \frac{1}{4} \sum_{\text{neighbors}} I_{\text{neighbor}} \right)$$

##### 4. Defining the Dimensionless Diffusion Constant $\lambda$
Let $\lambda = \frac{4\kappa \Delta t}{h^2} \in (0, 1)$. The continuous PDE simplifies directly into our game engine formula:
$$I_{x, y}(t + \Delta t) = (1 - \lambda) I_{x, y}(t) + \frac{\lambda}{4} \sum_{(i, j) \in \text{neighbors}} I_{i, j}(t)$$

##### Physical Interpretation:
- **$(1 - \lambda) I_{x, y}(t)$**: Thermal memory retention. The cell retains a fraction $(1 - \lambda)$ of its previous heat. If an obstacle moves away, old danger decays exponentially.
- **$\frac{\lambda}{4} \sum I_{\text{neighbor}}$**: Heat influx from surroundings. A fraction $\lambda$ of neighbor heat flows inward, divided equally by 4 across the cardinal directions.
- **Numerical Stability (CFL Condition)**: Forward Euler is physically stable if and only if $\lambda \le 1.0$. In practice, $\lambda \in [0.15, 0.35]$ produces a buttery-smooth gradient across the screen.

### 11.2 The Macro-to-Micro Pipeline
1. **Macro Level**: The enemy scans the Influence Grid and finds the cell $\vec{C}_{\text{safe}}$ with minimum hazard heat.
2. **Micro Level**: The enemy sets $\vec{C}_{\text{safe}}$ as an attraction target in its **Context Steering Interest Map**.
3. **Result**: The enemy navigates smoothly across the entire screen toward the safest zone, dodging moving obstacles seamlessly along the way.

---

---

## 12. Geometric Bullet Pattern AI (Danmaku Mathematics)

In retro arcade games (e.g. *Touhou*, *Ikaruga*, *Geometry Wars*), bosses create mesmerizing, geometric bullet patterns. These look complex but are driven by pure trigonometry.

### 1. The Radial Nova (Circular Burst)
Emits $N$ bullets in a full $360^\circ$ circle with angular offset $\theta_0$:

$$\theta_i = \theta_0 + \frac{2\pi i}{N}, \quad \vec{v}_i = v_b \begin{bmatrix} \cos\theta_i \\ \sin\theta_i \end{bmatrix}, \quad i \in \{0, 1, \dots, N-1\}$$

##### How We Got Here:
A complete circle contains $2\pi$ radians ($360^\circ$). To distribute $N$ projectiles with perfectly uniform spacing, divide the circle into $N$ equal angular sectors:
$$\Delta\theta = \frac{2\pi}{N}$$
Each bullet $i \in \{0, 1, \dots, N-1\}$ receives angle $\theta_i = \theta_0 + i \Delta\theta$.  
Multiplying the unit circle vector $[\cos\theta_i, \sin\theta_i]^T$ by scalar speed $v_b$ ensures every projectile expands outward with identical kinetic energy, forming an expanding regular polygon.

---

### 2. The Targeted Shotgun Fan
Shoots $M$ bullets in a spread cone centered directly on the player:

$$\theta_{\text{center}} = \text{atan2}(y_p - y_{\text{ai}}, x_p - x_{\text{ai}})$$
$$\theta_k = \theta_{\text{center}} + \left(k - \frac{M - 1}{2}\right) \cdot \Delta\theta, \quad k \in \{0, 1, \dots, M-1\}$$

```
                   SHOTGUN FAN PATTERN CENTERING
                          (M = 3 Bullets)
                                       k = 2: θ_center + Δθ
                                      ╱
        Enemy AI 🛸 ═════════════════● k = 1: θ_center (Bullseye)
                                      ╲
                                       k = 0: θ_center - Δθ
```

##### How We Got Here (The Symmetric Centering Offset):
Why do we multiply $\Delta\theta$ by $\left(k - \frac{M - 1}{2}\right)$?  
Suppose we want $M$ bullets indexed $k \in \{0, 1, \dots, M-1\}$ spaced by interval $\Delta\theta$. We want the entire burst to be centered symmetrically on $\theta_{\text{center}}$, meaning the average offset of all bullets must equal zero:
$$\sum_{k=0}^{M-1} \text{offset}_k = 0$$

The arithmetic midpoint (average value) of the indices $\{0, 1, \dots, M-1\}$ is:
$$\bar{k} = \frac{0 + (M - 1)}{2} = \frac{M - 1}{2}$$

Subtracting this midpoint from each index shifts the index range so it is centered precisely at $0$:
$$\text{offset}_k = \left(k - \frac{M - 1}{2}\right) \Delta\theta$$

Let's test this formula with concrete numbers:
- **Case 1: Odd Count ($M = 3$)**: Midpoint $\bar{k} = \frac{3 - 1}{2} = 1$.
  - $k = 0 \implies (0 - 1) = \mathbf{-1}$ (Left flank: $\theta_{\text{center}} - \Delta\theta$)
  - $k = 1 \implies (1 - 1) = \phantom{-}\mathbf{0}$ (Center laser directly at player!)
  - $k = 2 \implies (2 - 1) = \mathbf{+1}$ (Right flank: $\theta_{\text{center}} + \Delta\theta$)
- **Case 2: Even Count ($M = 4$)**: Midpoint $\bar{k} = \frac{4 - 1}{2} = 1.5$.
  - $k = 0 \implies (0 - 1.5) = \mathbf{-1.5}$
  - $k = 1 \implies (1 - 1.5) = \mathbf{-0.5}$
  - $k = 2 \implies (2 - 1.5) = \mathbf{+0.5}$
  - $k = 3 \implies (3 - 1.5) = \mathbf{+1.5}$

Notice that for even $M$, **no bullet travels at offset $0.0$**! The bullets straddle the player symmetrically on both sides, creating a natural escape lane right down the middle—a hallmark of fair bullet-hell game design. And this single formula handles both odd and even counts without any `if/else` logic!

---

### 3. The Archimedean Spiral Stream
By continuously firing bullets while incrementing the gun's emission angle at constant angular velocity $\omega$:

$$\theta_k(t) = \omega t + \frac{2\pi k}{M}, \quad k \in \{0, \dots, M-1\} \text{ spiral arms}$$

```
                     ARCHIMEDEAN PINWHEEL SPIRAL
                                      ● Bullet fired at t - 3Δt (Far away)
                                     ╱
                                    ● Bullet fired at t - 2Δt
                                   ╱
                                  ● Bullet fired at t - Δt
                                 ╱
                       Turret 🛸● (Firing at angle ωt)
```

##### How We Got Here (Kinematics of Spiral Formation):
Why does rotating a gun at constant speed naturally create an **Archimedean spiral** $r = a\theta$ in mid-air?

1. **Turret Rotation**: At emission time $\tau$, the gun points at angle:
   $$\theta(\tau) = \omega \tau \implies \tau = \frac{\theta}{\omega}$$
2. **Radial Bullet Flight**: Each bullet leaves the nozzle at constant linear speed $v_b$. At current time $t$, a bullet fired at past time $\tau$ has been flying for duration $\Delta t = (t - \tau)$.  
   Its radial distance from the gun is:
   $$r(t, \tau) = v_b (t - \tau)$$
3. **Eliminating Time $\tau$**: Substitute $\tau = \theta / \omega$ into the distance equation:
   $$r(\theta) = v_b \left(t - \frac{\theta}{\omega}\right) = v_b t - \left(\frac{v_b}{\omega}\right) \theta$$
4. **The Archimedean Form**: At any frozen instant of time $t$, $v_b t$ is a constant $r_0$. The equation relating radius and angle across all flying bullets is:
   $$r(\theta) = r_0 - a \theta, \quad \text{where } a = \frac{v_b}{\omega}$$

The distance from the center is directly proportional to the angle! This is the classical polar definition of an **Archimedean spiral**. The constant spacing between consecutive spiral arms is $\Delta r = 2\pi a = \frac{2\pi v_b}{\omega}$.

---

### 4. Curving / Swirling Lasers (Circular Kinematics)
If a bullet continuously rotates its velocity vector by angular velocity $\omega_{\text{curve}}$ every frame:
$$\theta_{t + \Delta t} = \theta_t + \omega_{\text{curve}} \Delta t$$
$$\vec{v}_{t + \Delta t} = v_b \begin{bmatrix} \cos\theta_{t + \Delta t} \\ \sin\theta_{t + \Delta t} \end{bmatrix}$$

##### How We Got Here:
When a projectile maintains constant speed $v_b$ while its direction rotates at constant rate $\omega_{\text{curve}} = \frac{d\theta}{dt}$, its trajectory curves along a **circular arc**.  
From classical circular kinematics, the centripetal acceleration is:
$$a_c = v_b \omega_{\text{curve}} = \frac{v_b^2}{R_{\text{turn}}}$$
Solving for the radius of curvature $R_{\text{turn}}$:
$$R_{\text{turn}} = \frac{v_b}{\omega_{\text{curve}}}$$
- High bullet speed $v_b$ or low $\omega_{\text{curve}} \implies$ wide, sweeping circular scythes.
- Low bullet speed $v_b$ or high $\omega_{\text{curve}} \implies$ tight corkscrews.

---

---

## 13. Sensory Perception: Vision Cones & Audio Bubbles

Enemies feel infinitely more lifelike when they can be **snuck up on** or **alerted by noise**.

```
                       \  Forward Vision Cone (120°) /
                        \       👁️                   /
                         \                          /
                          \        🛸 Enemy        /
                           -----------------------
                           (  👂 Sound Radius    )
```

### 13.1 The Field-of-View (FOV) Dot Product
Let $\hat{v}_{\text{facing}}$ be the enemy's unit facing direction and $\vec{r} = \vec{x}_p - \vec{x}_{\text{ai}}$ be the displacement vector to the player:

$$\cos\alpha = \hat{v}_{\text{facing}} \cdot \frac{\vec{r}}{\|\vec{r}\|}$$

$$\text{Player is IN Sight Cone} \iff \cos\alpha \ge \cos\left(\frac{\text{FOV}}{2}\right) \quad \text{and} \quad \|\vec{r}\| \le R_{\text{vision}}$$

#### How We Got Here (The Cosine Monotonicity & Inequality Flip):
A common pitfall for developers is writing `if (cosAlpha <= cosFOV)` because "we want the angle to be less than the FOV." Why does the inequality sign **flip** to $\ge$?

1. **The Dot Product Definition**:
   $$\vec{A} \cdot \vec{B} = \|\vec{A}\| \|\vec{B}\| \cos\alpha \implies \cos\alpha = \hat{A} \cdot \hat{B}$$
2. **The Monotonically Decreasing Cosine**:  
   On the angle interval $[0, \pi]$ ($0^\circ$ to $180^\circ$), the cosine function is strictly decreasing:
   $$\frac{d}{d\alpha} \cos\alpha = -\sin\alpha < 0 \quad \text{for } \alpha \in (0, \pi)$$
   - When the player is directly in front of the enemy ($\alpha = 0^\circ$): $\cos(0^\circ) = \mathbf{+1.0}$ (Maximum!).
   - When the player is at the half-cone edge ($\alpha = 60^\circ$): $\cos(60^\circ) = \mathbf{+0.50}$.
   - When the player is at the flank ($\alpha = 90^\circ$): $\cos(90^\circ) = \mathbf{0.0}$.
   - When the player is directly behind ($\alpha = 180^\circ$): $\cos(180^\circ) = \mathbf{-1.0}$.
3. **The Reversal**:  
   Because smaller angles yield **larger** cosines:
   $$\alpha \le \frac{\text{FOV}}{2} \iff \cos\alpha \ge \cos\left(\frac{\text{FOV}}{2}\right)$$
   For a $120^\circ$ cone, $\cos(60^\circ) = 0.50$. If the dot product is $\ge 0.50$, the player is inside the cone!

#### The 50x CPU Performance Advantage:
Calculating $\alpha = \arccos(\hat{v}_{\text{facing}} \cdot \hat{u}_r)$ requires the transcendental inverse trigonometric function `Math.acos()`, which consumes 50–100 CPU clock cycles.  
By precalculating $C_{\text{thresh}} = \cos(\text{FOV} / 2)$ once in the enemy constructor, the per-frame vision test becomes:
```javascript
// Precalculated once: this.cosHalfFOV = Math.cos((fovDegrees * Math.PI / 180) * 0.5);
const dot = vFacingX * uRayX + vFacingY * uRayY;
const inCone = (dot >= this.cosHalfFOV) && (distSq <= this.visionRangeSq);
```
This reduces the perception test to **2 multiplications, 1 addition, and 1 comparison**, enabling hundreds of stealth guards to run at a solid 60 FPS without dropping a single frame!

### 13.2 Acoustic Audio Bubbles
When the player fires a weapon, boosts afterburners, or collides with an asteroid, emit an acoustic bubble $R_{\text{sound}}$:
$$\text{Enemy Hears Player} \iff (x_p - x_{\text{ai}})^2 + (y_p - y_{\text{ai}})^2 \le R_{\text{sound}}^2$$
Testing squared distance avoids expensive `Math.sqrt()` or `Math.hypot()` operations. Dormant or patrolling enemies immediately investigate the sound origin $\vec{x}_{\text{sound}}$, allowing stealth gameplay.

---

---

## 14. Brain Architectures: FSMs vs. Behavior Trees vs. Utility Systems

How should an arcade AI make high-level decisions?

| Architecture | How It Works | Best For | When It Breaks |
|---|---|---|---|
| **Finite State Machine (FSM)** | Hardcoded states (`PATROL`, `CHASE`, `FLEE`) linked by transitions. | Classic arcade ghosts, simple bosses. | **Transition Hell**: As states grow from 3 to 10, transitions explode from 6 to 90. |
| **Behavior Tree (BT)** | Hierarchical tree of Tasks, Selectors (fallback), and Sequences (order). | Complex squad games (*Halo*). | Can become rigid and difficult to author for continuous arcade movement. |
| **Utility AI (Recommended)** | Every possible action calculates a real-time utility score $U \in [0, 1]$; highest wins. | Dynamic, emergent arcade combat. | Requires careful curve normalization. |

### Multi-Attribute Utility Formulation (MAUT)
To select an action dynamically, score each action using multiplied response curves:

$$U(\text{Action}) = \prod_{j=1}^{M} \left[f_j(x_j)\right]^{w_j}$$

#### Why Multiplicative Utility Beats Additive Utility:
In naive AI design, developers often add utility factors together: $U = w_1 f_1 + w_2 f_2$.
- **The "Compensation Trap"**:  
  Suppose an enemy evaluates `Action: MeleeAttack`:
  $$U_{\text{Melee}} = 0.5 \cdot \text{Proximity} + 0.5 \cdot \text{HasWeapon}$$
  If the enemy has **no weapon** ($\text{HasWeapon} = 0$), but is right next to the player ($\text{Proximity} = 1.0$), its score is $0.5(1.0) + 0.5(0) = \mathbf{0.50}$. If other actions score $0.40$, the AI tries to attack with an empty weapon! High proximity "compensated" for having zero weapons.
- **The Strict Veto Property of Multiplication**:  
  In multiplicative utility:
  $$U_{\text{Melee}} = (\text{Proximity})^{w_1} \times (\text{HasWeapon})^{w_2}$$
  If $\text{HasWeapon} = 0$, then $U = 1.0 \times 0.0 = \mathbf{0.0}$! The entire action is instantly vetoed, regardless of how close the enemy is.
- **Tuning Exponents ($w_j$)**:
  - $w = 1.0$: Linear response.
  - $w < 1.0$ (e.g. $w = 0.5$, square root): Concave curve with diminishing returns; tolerant of lower readiness.
  - $w > 1.0$ (e.g. $w = 2.0$, quadratic): Convex curve; drops off sharply if conditions are not near-perfect.

---

---

## 15. The Math Cheatsheet: Essential Formulas

Keep these handy in every 2D game project:

### 1. Vector Dot Product (Alignment & Projection)
$$\vec{A} \cdot \vec{B} = A_x B_x + A_y B_y$$
- **$+1.0$**: Both vectors point in the exact same direction ($\theta = 0^\circ$).
- **$0.0$**: Vectors are perpendicular ($\theta = 90^\circ$).
- **$-1.0$**: Vectors point in opposite directions ($\theta = 180^\circ$).

#### Proof (From the Law of Cosines):
Consider a triangle formed by vectors $\vec{A}$ and $\vec{B}$. The third side connecting their tips is $\vec{C} = \vec{B} - \vec{A}$.  
By the geometric Law of Cosines:
$$\|\vec{C}\|^2 = \|\vec{A}\|^2 + \|\vec{B}\|^2 - 2\|\vec{A}\|\|\vec{B}\|\cos\theta$$

Expand $\|\vec{C}\|^2$ algebraically in 2D Cartesian coordinates:
$$\|\vec{C}\|^2 = (B_x - A_x)^2 + (B_y - A_y)^2$$
$$= (B_x^2 - 2A_x B_x + A_x^2) + (B_y^2 - 2A_y B_y + A_y^2)$$
$$= (A_x^2 + A_y^2) + (B_x^2 + B_y^2) - 2(A_x B_x + A_y B_y)$$
$$= \|\vec{A}\|^2 + \|\vec{B}\|^2 - 2(A_x B_x + A_y B_y)$$

Equating the geometric and algebraic formulas:
$$\|\vec{A}\|^2 + \|\vec{B}\|^2 - 2(A_x B_x + A_y B_y) = \|\vec{A}\|^2 + \|\vec{B}\|^2 - 2\|\vec{A}\|\|\vec{B}\|\cos\theta$$
Subtract $\|\vec{A}\|^2 + \|\vec{B}\|^2$ from both sides:
$$-2(A_x B_x + A_y B_y) = -2\|\vec{A}\|\|\vec{B}\|\cos\theta$$
Divide by $-2$:
$$A_x B_x + A_y B_y = \|\vec{A}\|\|\vec{B}\|\cos\theta$$

Dividing by the product of lengths yields the angle cosine directly from coordinates:
$$\cos\theta = \frac{A_x B_x + A_y B_y}{\|\vec{A}\|\|\vec{B}\|}$$

---

### 2. Normalizing a Vector (Unit Direction)
Transforms any velocity or offset vector into a pure direction vector with length $1.0$:
```javascript
const length = Math.hypot(dx, dy) || 1e-6; // 1e-6 guards against division by zero!
const unitX = dx / length;
const unitY = dy / length;
```

---

### 3. Perpendicular (Normal) Vector
To get a $90^\circ$ vector (for circling, flanking, or surface normals):
```javascript
// Rotate 90 degrees counter-clockwise:
const perpCCWX = -unitY;
const perpCCWY =  unitX;

// Rotate 90 degrees clockwise:
const perpCWX =  unitY;
const perpCWY = -unitX;
```

#### Derivation (From the 2D Rotation Matrix):
Multiplying by rotation matrix $R(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}$:
- At $\theta = +90^\circ$: $\cos(90^\circ) = 0$, $\sin(90^\circ) = 1$:
  $$\begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} -y \\ x \end{bmatrix}$$
- At $\theta = -90^\circ$: $\cos(-90^\circ) = 0$, $\sin(-90^\circ) = -1$:
  $$\begin{bmatrix} 0 & 1 \\ -1 & 0 \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} y \\ -x \end{bmatrix}$$

---

### 4. Hyperbolic Tangent Curve (Combat Range Softener)
$$\delta(d) = \tanh\left(\frac{d - D_{\text{ideal}}}{\sigma}\right) = \frac{e^{\frac{d - D_{\text{ideal}}}{\sigma}} - e^{-\frac{d - D_{\text{ideal}}}{\sigma}}}{e^{\frac{d - D_{\text{ideal}}}{\sigma}} + e^{-\frac{d - D_{\text{ideal}}}{\sigma}}}$$
- **Asymptotic Limits**: Approaches $+1.0$ as $d \to \infty$; approaches $-1.0$ as $d \to 0$.
- **Smooth Equilibrium**: Smoothly passes through $0.0$ at $d = D_{\text{ideal}}$ with derivative $\frac{d}{dd}\delta = \frac{1}{\sigma}\text{sech}^2\left(\frac{d - D_{\text{ideal}}}{\sigma}\right)$.
- **No Explosion**: Unlike linear proportional control $(d - D_{\text{ideal}})$, $\tanh$ can never grow past $\pm 1$, ensuring distant objectives never overwhelm local obstacle avoidance.

---

---

---

---

## 16. Collision Mathematics: From Naive Center-Dots to Continuous Swept-Capsule (CCD)

Collision detection in 2D arcade games looks deceivingly trivial on paper, yet it is where most combat games secretly feel "broken", "spongy", or "unfair" to players. When a player fires a high-velocity laser that visibly slices right through a rock's jagged edge or grazes an asteroid corner without exploding, the illusion of precision collapses.

Here is the exact mathematical evolution from naive point collision to modern Continuous Collision Detection (CCD).

---

### 16.1 The Old Basic Collision Math (Discrete Point & Bounding Circle)

The textbook approach taught in most introductory game physics courses uses a simple two-phase discrete sampling model:

```
[Phase 1: Broadphase Bounding Circle] ──(Passed)──► [Phase 2: Discrete Ray-Cast / Edge Distance]
 (r_dist² <= (R_rock + R_bullet)²)                    (Sampled ONLY at discrete tick end (x, y))
```

#### Phase 1: Broadphase Distance Cull
Before testing polygon geometry, test whether the distance between the bullet center and the asteroid center is within their combined maximum radii:
$$(x_{\text{bullet}} - x_{\text{rock}})^2 + (y_{\text{bullet}} - y_{\text{rock}})^2 \le (R_{\text{rock}} + R_{\text{bullet}})^2$$

#### Phase 2: Point-in-Polygon (Jordan Curve Theorem & Ray Casting)
If broadphase passes, determine whether the bullet's center point $(P_x, P_y)$ lies inside the rock's $N$-vertex polygon by casting a horizontal ray to infinity:

$$\text{intersects} = (y_i > P_y \neq y_j > P_y) \land \left(P_x < \frac{(x_j - x_i)(P_y - y_i)}{y_j - y_i} + x_i\right)$$

Every edge crossed toggles an `inside = !inside` boolean. An odd number of crossings means the point is inside.

##### How We Got Here (Deriving the Horizontal Ray Intersection):
1. **The Horizontal Ray**: Cast an imaginary ray starting at $(P_x, P_y)$ extending horizontally rightward toward $(+\infty, P_y)$.
2. **Straddle Test (Height Check)**: For an edge connecting vertex $(x_i, y_i)$ to $(x_j, y_j)$, the horizontal ray at height $P_y$ can only intersect the edge if one endpoint lies above $P_y$ and the other lies at or below $P_y$:
   $$(y_i > P_y) \neq (y_j > P_y)$$
3. **X-Crossing Coordinate**: The linear equation of the line passing through both vertices is:
   $$\frac{x_{\text{cross}} - x_i}{x_j - x_i} = \frac{y_{\text{cross}} - y_i}{y_j - y_i}$$
   Setting $y_{\text{cross}} = P_y$ and solving for $x_{\text{cross}}$:
   $$x_{\text{cross}} = x_i + \frac{(x_j - x_i)(P_y - y_i)}{y_j - y_i}$$
4. **Rightward Ray Condition**: Because our ray points rightward toward $+\infty$, the intersection must be to the right of the test point:
   $$P_x < x_{\text{cross}} \implies P_x < x_i + \frac{(x_j - x_i)(P_y - y_i)}{y_j - y_i}$$
5. **The Jordan Curve Theorem**: In topology, any closed loop divides the plane into an interior and exterior. Any ray starting from an interior point must cross the boundary an **odd number of times** to reach infinity. If the total crossing count is odd, the bullet is inside the rock!

#### Phase 3: Point-to-Segment Distance (Edge Tangent Check)
To test if a circular bullet of radius $R_b$ grazes an edge $AB$:
1. Project vector $\vec{AP} = \vec{P} - \vec{A}$ onto edge segment $\vec{AB} = \vec{B} - \vec{A}$:
   $$t = \text{clamp}\left(\frac{\vec{AP} \cdot \vec{AB}}{|\vec{AB}|^2}, 0, 1\right)$$
2. Find the closest point $\vec{Q} = \vec{A} + t\vec{AB}$.
3. Check Euclidean distance:
   $$||\vec{P} - \vec{Q}||^2 \le R_b^2$$

##### How We Got Here (Parabolic Minimization of Distance Squared):
1. Any point $\vec{Q}(t)$ along the edge segment $AB$ is given parametrically by:
   $$\vec{Q}(t) = \vec{A} + t \vec{AB} \quad \text{for } t \in [0, 1]$$
2. The squared Euclidean distance from test point $\vec{P}$ to $\vec{Q}(t)$ is:
   $$f(t) = \|\vec{Q}(t) - \vec{P}\|^2 = \|(\vec{A} - \vec{P}) + t\vec{AB}\|^2 = \|-\vec{AP} + t\vec{AB}\|^2$$
   Expanding the vector norm:
   $$f(t) = \|\vec{AP}\|^2 - 2t(\vec{AP} \cdot \vec{AB}) + t^2 \|\vec{AB}\|^2$$
3. This is a quadratic parabola $f(t) = a t^2 + b t + c$ opening upwards ($a = \|\vec{AB}\|^2 > 0$). To find the value of $t$ that minimizes distance, take the derivative with respect to $t$ and set it to zero:
   $$f'(t) = -2(\vec{AP} \cdot \vec{AB}) + 2t \|\vec{AB}\|^2 = 0$$
   $$\implies t = \frac{\vec{AP} \cdot \vec{AB}}{\|\vec{AB}\|^2}$$
4. Clamping $t \in [0, 1]$ constrains the closest point to the physical segment bounds rather than extending infinitely past corners $A$ or $B$:
   - If $t < 0 \implies t^* = 0$: Corner $A$ is the closest point.
   - If $t > 1 \implies t^* = 1$: Corner $B$ is the closest point.
   - If $0 \le t \le 1$: The perpendicular projection falls cleanly onto the edge segment.
5. The closest point coordinate is $\vec{Q} = \vec{A} + t^* \vec{AB}$, and the bullet grazes the edge if $\|\vec{P} - \vec{Q}\|^2 \le R_b^2$.

---

### 16.2 The Two Fatal Flaws: Ghost Margins & Frame Tunneling

Why did this old math cause fast bullets to visibly graze past asteroids without registering?

```
                     FLAW 1: THE GHOST MARGIN BUG
      ┌──────────────────────────────────────────────────────────┐
      │  Outer Rendered Plasma Glow: r = 5.5px - 6.3px           │
      │  (Drawn with arc() & shadowBlur = 10 bloom)              │
      │                                                          │
      │       ┌──────────────────────────────────────────┐       │
      │       │  Old Hitbox Tested: r = 3.0px            │       │
      │       │  (Outer 55% of visual sprite is a ghost!)│       │
      │       └──────────────────────────────────────────┘       │
      └──────────────────────────────────────────────────────────┘

                    FLAW 2: FAST FRAME TUNNELING
    Tick t: Bullet at (100, 50)                      Tick t+1: Bullet at (116, 50)
             Outside                                          Outside (hopped past!)
                ○ ───► ───► ───► [Rock Edge at x=108] ───► ───► ───► ○
                           (Zero collision registered!)
```

#### Flaw 1: The "Ghost Margin" (Render vs. Hitbox Mismatch)
* **What the player sees**: Modern canvas games draw lasers with radiant glows and outer plasma envelopes ($r_{\text{visual}} = r_{\text{core}} \times 1.8 \approx 5.5\text{px} - 6.3\text{px}$) plus a 10px outer bloom blur (`ctx.shadowBlur`).
* **What the math tested**: If the collision check hardcodes `bRadius = bullet.radius` ($3.0\text{px}$), the outer $55\%$ of the visible bullet is a mathematical "ghost."
* **The bug**: When an asteroid edge grazes the bullet between $3.1\text{px}$ and $6.0\text{px}$ from its center, the player sees a clear direct hit, but the engine rejects it!

#### Flaw 2: High-Velocity Frame Tunneling (The Discrete Hop)
* Player lasers travel at **$14\text{ to }17\text{ px/frame}$**, and UFO lasers travel at **$11.5\text{ px/frame}$**.
* A discrete collision check only samples the bullet's coordinate at tick end $(x, y)$.
* If a jagged rock edge is 6px thick, a bullet at distance 4px from the edge will jump 16px in a single frame. At tick $t$, its center is outside the rock; at tick $t+1$, it has already jumped 12px past the other side!
* Neither sample point falls inside the polygon or within 3px of the segment. The bullet literally tunnels straight through the asteroid in a single tick!

---

### 16.3 The Modern Solution: Continuous Swept-Capsule Detection (CCD)

To make collision 100% airtight at any bullet speed and angle, the bullet cannot be treated as an instantaneous point. It must be treated as a **Continuous Swept Capsule** (a cylinder capped with semicircles) representing the bullet's entire trajectory during that frame:

$$\text{Trajectory Segment}: \quad \vec{P}_0 = (x - dx, y - dy) \quad \longrightarrow \quad \vec{P}_1 = (x, y)$$

```
                           SWEPT CAPSULE GEOMETRY
                ╭───────────── Trajectory Segment ─────────────╮
               (  P₀ (Prev) •=======================• P₁ (Curr)  )
                ╰─────────────────── Radius Rc ─────────────────╯
```

#### Stage 1: Swept Broadphase Bounding Sphere
Anchor the broadphase cull to the swept segment's midpoint $\vec{P}_{\text{mid}} = \frac{\vec{P}_0 + \vec{P}_1}{2}$ with an expanded radius encompassing the full step length:
$$R_{\text{broad}} = R_{\text{rock}} + R_c + \frac{||\vec{v}||}{2}$$
$$||\vec{P}_{\text{mid}} - \vec{C}_{\text{rock}}||^2 \le R_{\text{broad}}^2$$

#### Stage 2: 2D Line-Segment vs. Line-Segment Crossing (Zero Tunneling)

This is the mathematical core of Continuous Collision Detection. Instead of checking if a point is inside a shape at a single instant, we ask:
> *"Did the bullet's travel path across this 16ms frame physically cut across any edge of the asteroid, like blades of scissors closing?"*

```
                 SEGMENT INTERSECTION: THE SCISSORS TEST
                     
         Bullet Start P₀(x₁, y₁) [t = 0]
                 \
                  \       Asteroid Vertex A(x₃, y₃) [u = 0]
                   \          /
                    \        /
                     \      /
                      \    /
                       \  /  <-- Intersection Point: (0 <= t <= 1) AND (0 <= u <= 1)
                        \/
                        /\
                       /  \
                      /    \
                     /      \
                    /        \
  Asteroid Vertex B(x₄, y₄)   \
           [u = 1]             Bullet End P₁(x₂, y₂) [t = 1]
```

##### 1. The Parametric "Timeline" Concept (Sliders $t$ and $u$)
Why don't we use the familiar high-school line equation $y = mx + b$?
Because if a laser fires straight up or straight down, its slope $m = \frac{\Delta y}{\Delta x} = \frac{\Delta y}{0} = \infty$. The computer divides by zero and crashes!

Instead, game physics uses **parametric line equations**. Think of $t$ and $u$ as independent **progress sliders** that run from $0.0$ to $1.0$:

1. **The Bullet's Travel Path (Slider $t \in [0, 1]$)**:
   A bullet starts at $\vec{P}_0 = (x_1, y_1)$ and moves to $\vec{P}_1 = (x_2, y_2)$:
   $$x(t) = x_1 + t(x_2 - x_1)$$
   $$y(t) = y_1 + t(y_2 - y_1)$$
   - When $t = 0$: The bullet is at its starting point $(x_1, y_1)$ at the beginning of the frame.
   - When $t = 1$: The bullet is at its final point $(x_2, y_2)$ at the end of the frame.
   - When $t = 0.5$: The bullet is halfway through its flight during this frame.
   - If $t < 0$: The point is in the bullet's past (behind where it started).
   - If $t > 1$: The point is in the bullet's future (it hasn't traveled that far yet).

2. **The Asteroid Edge (Slider $u \in [0, 1]$)**:
   A rock edge connects vertex $\vec{A} = (x_3, y_3)$ to vertex $\vec{B} = (x_4, y_4)$:
   $$x(u) = x_3 + u(x_4 - x_3)$$
   $$y(u) = y_3 + u(y_4 - y_3)$$
   - When $u = 0$: Exactly at rock corner $A$.
   - When $u = 1$: Exactly at rock corner $B$.
   - When $0 \le u \le 1$: Anywhere along the physical rock edge between corners $A$ and $B$.
   - If $u < 0$ or $u > 1$: Out in empty space, past the rock's corners along the infinite line.

---

##### 2. Finding Where They Cross (Setting Them Equal)
If the bullet's flight path crosses the asteroid edge, there must exist a point where both equations yield the **exact same coordinate**:
$$x_1 + t(x_2 - x_1) = x_3 + u(x_4 - x_3)$$
$$y_1 + t(y_2 - y_1) = y_3 + u(y_4 - y_3)$$

This is a classic system of **two linear equations with two unknowns** ($t$ and $u$).

Let's group the unknowns on the left side and constants on the right side:
1. $t(x_1 - x_2) - u(x_3 - x_4) = x_1 - x_3$
2. $t(y_1 - y_2) - u(y_3 - y_4) = y_1 - y_3$

To keep the algebra clean, let's temporarily give names to the delta coordinates:
- $\Delta x_{\text{bullet}} = x_1 - x_2, \quad \Delta y_{\text{bullet}} = y_1 - y_2$
- $\Delta x_{\text{rock}} = x_3 - x_4, \quad \Delta y_{\text{rock}} = y_3 - y_4$
- $\Delta x_{\text{start}} = x_1 - x_3, \quad \Delta y_{\text{start}} = y_1 - y_3$

Our equations become:
$$\text{Eq (1):} \quad t \cdot \Delta x_{\text{bullet}} - u \cdot \Delta x_{\text{rock}} = \Delta x_{\text{start}}$$
$$\text{Eq (2):} \quad t \cdot \Delta y_{\text{bullet}} - u \cdot \Delta y_{\text{rock}} = \Delta y_{\text{start}}$$

---

##### 3. Solving for $t$ by Elimination (Where the Determinant Comes From)
To eliminate $u$, multiply Eq (1) by $\Delta y_{\text{rock}}$ and Eq (2) by $\Delta x_{\text{rock}}$:
$$\text{Eq (1)} \times \Delta y_{\text{rock}}: \quad t \cdot (\Delta x_{\text{bullet}} \cdot \Delta y_{\text{rock}}) - u \cdot (\Delta x_{\text{rock}} \cdot \Delta y_{\text{rock}}) = \Delta x_{\text{start}} \cdot \Delta y_{\text{rock}}$$
$$\text{Eq (2)} \times \Delta x_{\text{rock}}: \quad t \cdot (\Delta y_{\text{bullet}} \cdot \Delta x_{\text{rock}}) - u \cdot (\Delta x_{\text{rock}} \cdot \Delta y_{\text{rock}}) = \Delta y_{\text{start}} \cdot \Delta x_{\text{rock}}$$

Now subtract the second equation from the first equation:
$$t \cdot \left[ \Delta x_{\text{bullet}} \cdot \Delta y_{\text{rock}} - \Delta y_{\text{bullet}} \cdot \Delta x_{\text{rock}} \right] = \Delta x_{\text{start}} \cdot \Delta y_{\text{rock}} - \Delta y_{\text{start}} \cdot \Delta x_{\text{rock}}$$

Look at the term multiplying $t$ in brackets! That bracketed term is the **system determinant** $D$:
$$D = \Delta x_{\text{bullet}} \cdot \Delta y_{\text{rock}} - \Delta y_{\text{bullet}} \cdot \Delta x_{\text{rock}}$$
Plugging back our original coordinate variables:
$$D = (x_1 - x_2)(y_3 - y_4) - (y_1 - y_2)(x_3 - x_4)$$

Dividing both sides by $D$ gives the exact value of $t$:
$$t = \frac{(x_1 - x_3)(y_3 - y_4) - (y_1 - y_3)(x_3 - x_4)}{D}$$

---

##### 4. Solving for $u$
Similarly, multiplying Eq (1) by $\Delta y_{\text{bullet}}$ and Eq (2) by $\Delta x_{\text{bullet}}$ eliminates $t$ and solves for $u$:
$$u = -\frac{(x_1 - x_2)(y_1 - y_3) - (y_1 - y_2)(x_1 - x_3)}{D}$$

Notice that both $t$ and $u$ share the **exact same denominator** $D$. We only calculate $D$ once!

---

##### 5. What Does the Determinant $D$ Physically Represent?
In 2D vector geometry, $D$ is the **2D Cross Product** (or perpendicular dot product) between the bullet's direction vector $\vec{v}_{\text{bullet}}$ and the asteroid edge vector $\vec{v}_{\text{rock}}$:

$$D = \vec{v}_{\text{bullet}} \times \vec{v}_{\text{rock}} = |\vec{v}_{\text{bullet}}| \cdot |\vec{v}_{\text{rock}}| \cdot \sin(\theta)$$

Geometrically, $D$ equals the **signed area of the parallelogram** spanned by the two direction vectors:

```
                  PARALLELOGRAM SPANNED BY THE TWO VECTORS
                         
                           ╭────────────────────────────•
                          ╱                            ╱
                         ╱                            ╱
       v_rock (Asteroid)╱                            ╱
                       ╱       Area = |D|           ╱
                      ╱                            ╱
                     •────────────────────────────╯
                               v_bullet (Laser)
```

Why is this determinant so incredibly useful?
1. **Zero Division Guard (Parallel Lines)**:
   If the bullet is traveling parallel to the asteroid edge, the angle between them is $\theta = 0^\circ$ (or $180^\circ$).  
   Since $\sin(0^\circ) = 0$, the parallelogram collapses flat $\implies$ **Area $D = 0$**!  
   In code, checking `if (Math.abs(d) < 1e-9) return false;` immediately tells us the two segments are parallel and will never intersect, saving us from a fatal division-by-zero crash.
2. **High-Speed Execution**:
   Evaluating $D$ requires only **4 subtractions and 2 multiplications**. No trigonometry, no square roots, and no matrix libraries needed!

---

##### 6. The Golden Intersection Condition: Why $0 \le t \le 1$ and $0 \le u \le 1$?
Once we compute $t$ and $u$, the collision decision is a simple, elegant check:

$$\text{Collision Confirmed} \iff (0 \le t \le 1) \quad \text{AND} \quad (0 \le u \le 1)$$

| Variable Value | Physical Meaning | Collision Status |
|---|---|---|
| $t < 0$ | The intersection point was behind where the bullet started. | ❌ Miss (Happened in the past) |
| $t > 1$ | The bullet hasn't reached the intersection yet. | ❌ Miss (Will happen in future frames) |
| $0 \le t \le 1$ | **The intersection occurs during this exact 16ms frame!** | ⏳ Valid timeframe |
| $u < 0$ or $u > 1$ | The bullet crossed the infinite line, but passed beyond the rock's corners in empty space. | ❌ Miss (Flew past the asteroid) |
| $0 \le u \le 1$ | **The intersection struck directly on the physical rock edge between corners A and B!** | ⏳ Valid obstacle contact |
| **Both $t, u \in [0, 1]$** | **The bullet path and the rock edge physically sliced through each other!** | ✅ **100% Guaranteed Collision!** |

This guarantees that no matter how fast a laser travels—even jumping 100 pixels in a single tick—it can never leap across an asteroid boundary unnoticed. Tunneling is mathematically impossible.

#### Stage 3: Swept Capsule Spine Proximity (Tangential Grazes)
If the bullet didn't cut all the way through an edge, did its glowing plasma envelope brush against an edge?
Evaluate the segment distance $d^2(\vec{P}, AB)$ across three sample points along the capsule spine:
1. Start point $\vec{P}_0 = (x - dx, y - dy)$
2. Midpoint $\vec{P}_{\text{mid}} = (\vec{P}_0 + \vec{P}_1) / 2$
3. End point $\vec{P}_1 = (x, y)$

$$\text{Edge Graze} \iff \min\left(d^2(\vec{P}_0, AB), d^2(\vec{P}_{\text{mid}}, AB), d^2(\vec{P}_1, AB)\right) \le R_c^2$$

#### Stage 4: Asteroid Vertex-to-Capsule Distance (Sharp Corner Graze)
What if a sharp asteroid corner $\vec{V}_i$ points into the side of the swept capsule without crossing the center line?
Test the distance from each vertex $\vec{V}_i$ to the bullet's trajectory segment $\vec{P}_0 \vec{P}_1$:
$$t = \text{clamp}\left(\frac{(\vec{V}_i - \vec{P}_0) \cdot (\vec{P}_1 - \vec{P}_0)}{||\vec{P}_1 - \vec{P}_0||^2}, 0, 1\right)$$
$$\vec{Q} = \vec{P}_0 + t(\vec{P}_1 - \vec{P}_0)$$
$$\text{Corner Graze} \iff ||\vec{V}_i - \vec{Q}||^2 \le R_c^2$$

---

### 16.4 Production Implementation in Spaceship Flight

Here is the exact, high-performance algorithm operating in `Rock.prototype.containsBullet` in `game.js`:

```javascript
containsBullet(bullet) {
  // 1. Authoritative Hitbox Radius: Queried directly from bullet object
  const bRadius = bullet.collisionRadius || bullet.radius || 3;
  const rSq = bRadius * bRadius;

  const p1x = bullet.x;
  const p1y = bullet.y;
  const p0x = bullet.dx !== undefined ? bullet.x - bullet.dx : p1x;
  const p0y = bullet.dy !== undefined ? bullet.y - bullet.dy : p1y;

  // 2. Swept Broadphase Cull
  const midX = (p0x + p1x) * 0.5;
  const midY = (p0y + p1y) * 0.5;
  const distSq = (midX - this.x) ** 2 + (midY - this.y) ** 2;
  const stepLen = Math.hypot(bullet.dx || 0, bullet.dy || 0);
  const maxDist = this.radius * 1.6 + bRadius + stepLen * 0.5;
  if (distSq > maxDist * maxDist) return false;

  // 3. Point-in-Polygon (Endpoints & Midpoint)
  if (this.containsPoint(p1x, p1y) || this.containsPoint(p0x, p0y) || this.containsPoint(midX, midY)) {
    return true;
  }

  const pts = this.getTransformedPoints();

  // 4. Continuous Trajectory Ray-Crossing (Eliminates Tunneling)
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (this.segmentsIntersect(p0x, p0y, p1x, p1y, pts[j].x, pts[j].y, pts[i].x, pts[i].y)) {
      return true;
    }
  }

  // 5. Swept Capsule Edge Distance (Catches Grazes Along Path)
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const x1 = pts[j].x, y1 = pts[j].y;
    const x2 = pts[i].x, y2 = pts[i].y;
    if (
      this.distToSegmentSquared(p1x, p1y, x1, y1, x2, y2) <= rSq ||
      this.distToSegmentSquared(midX, midY, x1, y1, x2, y2) <= rSq ||
      this.distToSegmentSquared(p0x, p0y, x1, y1, x2, y2) <= rSq
    ) {
      return true;
    }
  }

  // 6. Vertex-to-Capsule Distance (Catches Jagged Corners)
  for (let i = 0; i < pts.length; i++) {
    if (this.distToSegmentSquared(pts[i].x, pts[i].y, p0x, p0y, p1x, p1y) <= rSq) {
      return true;
    }
  }

  return false;
}
```
With $N \le 8$ vertices per asteroid, this complete four-stage CCD pipeline executes in **under $0.8$ microseconds** on standard hardware, eliminating all ghosting and tunneling while remaining buttery-smooth at 60 FPS.

---

---

## 17. Responsive Scaling (Never Hardcode Pixels)

Never write hardcoded pixel constants like `const speed = 5`, `const radar = 200`, or `const bulletRadius = 3`. On a 4K desktop monitor, a 3px bullet is a microscopic, barely discernible speck; on a small smartphone screen, a 6px bullet might cover a disproportionate chunk of the playfield.

### 17.1 Anchoring Entity Metrics to Screen Proportions
Always anchor metrics to a responsive screen scale factor derived from the playable canvas area:
```javascript
// Base metric: the responsive reference dimension
function getScreenScale(canvas) {
  if (!canvas) return 1.0;
  const baseDimension = Math.min(canvas.width, Math.max(450, canvas.height * 1.6));
  return Math.max(0.6, Math.min(2.0, baseDimension / 1000));
}
```

### 17.2 Dynamic Hitbox Sizing (Zero Magic Numbers in Collisions)
Bullets must encapsulate their own dynamic sizing so that collision code never has to guess or hardcode multipliers:
```javascript
class Bullet {
  constructor(x, y, angle, shipDx, shipDy, sizeFactor = 1.0) {
    this.x = x;
    this.y = y;
    this.sizeFactor = sizeFactor;

    // Both visual body and physical hitbox scale synchronously with the screen:
    this.coreRadius = 3.0 * sizeFactor;
    this.visualRadius = 5.5 * sizeFactor; // Rendered outer plasma envelope
    this.collisionRadius = this.visualRadius; // Hitbox strictly mirrors rendered envelope
    this.radius = this.coreRadius;
    // ...
  }
}
```

Now, whether your game is running on an iPhone, an iPad, a standard 1080p laptop, or an ultra-wide 4K gaming monitor:
1. Bullets remain visibly crisp and proportionally balanced.
2. The collision hull perfectly matches the visible rendered plasma bolt.
3. The AI flies at the exact same proportional speed and dodges at the exact same reaction time.

---

# PART II: CASE STUDY: THE "SPACESHIP FLIGHT" ENEMY UFO IMPLEMENTATION

---

## 18. Saucer Profile: The Orbiting Harasser Archetype

In *Spaceship Flight*, our enemy UFO concretely implements **Archetype 3 (The Orbiting Harasser)** from Section 8. Rather than mindlessly charging at the player or fleeing across the screen, it dances through dense asteroid swarms, circles the player's ship at an optimal combat standoff distance, and presents a dynamic challenge without feeling unfair or frustrating.

```
       [ASTEROID BELT]                                   [TACTICAL ORBIT]
              🪨                                                 ╭────────╮
                                                           ╭─────╯   🛸   ╰─────╮
         🪨       🛸 (Saucer Harasser)                     │      (Saucer)      │
                                                           │         │          │
              🪨                                           │         ▼          │
                                                           │      [Player 🚀]   │
                                                           ╰────────────────────╯
```

### Exact Production Tuning Parameters
From our game engine (`game.js`):
- **Standoff Distance**: $D_{\text{combat}} = 0.40 \times \min(W, H)$ (keeps the saucer in effective laser engagement range).
- **Tactical Weights**:
  - $w_{\text{player}} = 0.8$ (pursuit / retreat drive toward the standoff perimeter).
  - $w_{\text{flank}} = 0.6$ (tangential orbit drive).
  - $w_{\text{bound}} = 1.2$ (soft arena boundary cushion).
  - $w_{\text{inertia}} = 0.7$ (forward stabilization bonus; suppressed during danger).
  - $w_{\text{danger}} = 5.0$ (strong safety penalty guaranteeing survival strictly dominates combat).
- **Dynamic Orbit Reversals**: The combat computer randomly inverts its orbit direction $\text{dir}_{\text{orbit}} \in \{+1, -1\}$ every 5 to 8 seconds, keeping its flight path unpredictable and organic.

---

## 19. Production Code: The UFO's JavaScript Context Steering Engine

Here is the complete, production-grade JavaScript implementation of `ContextSteeringBrain` operating in `game.js` for our enemy saucer:

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
    const radarRange = Math.max(180, ufo.radius * 8.0);

    // -------------------------------------------------------------
    // STEP 1: POPULATE DANGER MAP (Dual Urgency: Kinematic + Proximity)
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

        // Static spatial proximity urgency (prevents slow/crossing rocks from being ignored!)
        const proximityFactor = Math.max(0, 1.0 - dist / (radarRange + obs.radius));
        const urgencyProximity = proximityFactor * 2.5;

        const urgency = Math.max(urgencyKinematic, urgencyProximity);
        const safeClearance = ufo.radius + obs.radius + ufo.radius * 0.45;

        // Project obstacle onto candidate rays
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
    // STEP 2: POPULATE INTEREST MAP (Inertia Suppressed When Threatened)
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

    // Suppress inertia bonus if current flight path is in danger!
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
    // STEP 3: SCORE EVALUATION & RESPONSIVE HYSTERESIS SELECTION
    // -------------------------------------------------------------
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let k = 0; k < N; k++) {
      // Strong 5.0 safety weighting guarantees survival strictly dominates desire
      const score = interest[k] - 5.0 * danger[k];
      if (score > bestScore) {
        bestScore = score;
        bestIndex = k;
      }
    }

    // Responsive Hysteresis: ZERO stubbornness if current path has any danger
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

---

## 20. The UFO's Dual-Channel Combat System

```
                         ┌────────────────────────────────────────┐
                         │          UFO Combat Computer           │
                         └───────────────────┬────────────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
       [Offensive Player Laser]                       [Defensive Dual-Sided CIWS]
       - Cooldown: 121–200 frames (~2.0s–3.3s)        - Cooldown: 45 frames (~0.75s)
       - Targets the player rocket                    - Targets imminent asteroid collisions
       - Ventral emitter (+0.0156w, +0.1406h)         - Dual Port/Starboard emitters
       - 50% Emerald Direct / 50% Violet Lead         - Red (Port) / Blue (Starboard)
```

---

### 20.1 Channel 1: Symmetrical Dual Port/Starboard CIWS (Red vs. Blue)
When an asteroid enters the UFO's defensive perimeter ($d < 160\text{px}$, $v_{\text{closing}} > 0.15\text{ px/frame}$, $t_{\text{impact}} < 1.30\text{s}$), the combat computer evaluates which flank the threat is on by projecting the lead intercept vector onto the saucer's local coordinate frame:

$$\text{localX} = \text{leadX} \cdot \cos\theta + \text{leadY} \cdot \sin\theta$$

1. **Left Flank Threat ($\text{localX} < 0$) $\implies$ Port Turret**:
   - **Spawn Muzzle**: Left emitter aperture at $(-0.2656w, +0.1094h)$.
   - **Hull Light**: Left Red Light flashes vivid ruby-red (`#ff1744`).
   - **Laser Bolt**: Discharges a Ruby-Red defensive bolt (`#ff1744` outer, `#ef4444` core).
   - **Detonation**: Asteroid pops in a shower of ruby-red spark particles (`#ff1744`).
2. **Right Flank Threat ($\text{localX} \ge 0$) $\implies$ Starboard Turret**:
   - **Spawn Muzzle**: Right emitter aperture at $(+0.2656w, +0.1094h)$.
   - **Hull Light**: Right Blue Light flashes vivid royal-blue (`#1761f2`, matching the exact blue on `enemyship.png`).
   - **Laser Bolt**: Discharges a Royal-Blue defensive bolt (`#1761f2` outer, `#2563eb` glow).
   - **Detonation**: Asteroid pops in a shower of royal-blue spark particles (`#1761f2`).

---

### 20.2 Clarifying Physical Muzzle Spawn Coordinate vs. Intelligent Dynamic Lead Aiming

> [!IMPORTANT]
> **Do not confuse the physical muzzle spawn coordinates with the bullet's flight direction!**

* **The Muzzle Coordinate $(-0.2656w, +0.1094h)$**:  
  This is purely the **physical spawn origin $(x_0, y_0)$ on the saucer hull**. It guarantees the laser visually emerges from the red light aperture on the sprite rather than magically appearing out of thin air in the center of the ship.
* **The Dynamic Aim Vector $(bVx, bVy)$**:  
  The flight direction is **completely dynamic and omnidirectional**. The UFO's combat computer calculates the asteroid's velocity, solves travel time $t = d / v_{\text{laser}}$, projects future rock coordinates $\vec{x}_{\text{intercept}} = \vec{x}_{\text{rock}} + \vec{v}_{\text{rock}} \cdot t$, and normalizes $(bVx, bVy)$ directly toward that predicted intercept point!

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

### 20.3 Channel 2: Offensive Laser Cannon (50% Emerald Direct / 50% Violet Lead)
The UFO's primary offensive weapon fires at the player with deliberate, forgiving combat pacing ($2.0\text{s} - 3.3\text{s}$ cooldown, tuned to ~0.7x frequency), preceded by a 22-frame ($0.35\text{s}$) charging telegraph on the central aperture:

* **🟢 Emerald Green Mode (`#00ff8e`) — 50% of Shots**:
  - **Aim**: Direct tracking of player coordinates.
  - **Telegraph**: Center light glows incandescent emerald green.
  - **Counterplay**: **Keep moving!** The shot hits where you were; maintaining speed guarantees a clean dodge.
* **🟣 Alien Violet Mode (`#c084fc`) — 50% of Shots**:
  - **Aim**: Predictive lead intercept solving future player position.
  - **Telegraph**: Center light glows intense alien violet.
  - **Counterplay**: **Brake, reverse, or cut hard!** The shot leads your trajectory; changing speed or direction makes it fly harmlessly past.

---

## 21. Diegetic Hull Light System (`enemyship.png` Mathematical Mapping)
The highest echelon of game AI design is **diegetic feedback**: communicating internal AI state through visual cues embedded on the physical ship model rather than external HUD text.

On the 32×32 enemy saucer (`enemyship.png`), three distinct indicator apertures line the hull rim with exact mathematical alignment to the sprite:

```
               ┌─────────────[Lavender Cockpit Dome]─────────────┐
               │                                                 │
     [🔴 Left Light]                  [🟢/🟣 Center Light]             [🔵 Right Light]
   (-0.2656w, +0.1094h)             (+0.0156w, +0.1406h)             (+0.2656w, +0.1094h)
    Danger Strobe & Port CIWS         Primary Cannon Telegraph        Danger Strobe & Starboard CIWS
```

1. **Synchronized Danger Emergency Strobe (🔴 Red & 🔵 Blue Flash Together!)**:
   - **Trigger**: Imminent collision trajectory detected ($v_{\text{closing}} > 0.15$, obstacle in flight path).
   - **Behavior**: Like emergency law-enforcement beacons, the **Left Red Light** (`#ff1744`) and **Right Blue Light** (`#1761f2`) flash synchronously in high-visibility warning strobe.
   - **Gameplay Read**: Alerts the player that the UFO is in emergency evasive maneuvering and fighting for survival.
2. **Center Light (🟢 Emerald vs. 🟣 Violet Primary Cannon Telegraph)**:
   - **Position**: Centered at $(+0.0156w, +0.1406h)$ on the ventral weapon aperture.
   - **Trigger**: Offensive cannon charging ($t_{\text{telegraph}} \in [0, 22]$ frames / $\approx 0.35\text{s}$).
   - **Dual Targeting Modes (Identical Size & Glowing Halo)**:
     - **🟢 Emerald Green (`#00ff8e`) — 50% of Shots**: **Direct Aim** (aiming directly at player's current coordinate).  
       *Player Counter-Tactic*: **Keep moving!** The bolt will hit where you were, so maintaining velocity guarantees a clean dodge.
     - **🟣 Alien Violet (`#c084fc`) — 50% of Shots**: **Predictive Lead** (calculating your velocity vector and leading you with $t_{\text{lead}} = d / v_{\text{laser}}$).  
       *Player Counter-Tactic*: **Brake, cut, or reverse!** The bolt will fly to where you were heading, so changing direction or slowing down causes the predictive shot to fly harmlessly past.
   - **Single Unified Light**: There is only one central weapon aperture; it illuminates as a glowing circular bead in emerald green when targeting direct, and in alien purple when targeting predictive.
3. **Dual-Sided Defensive Point-Defense CIWS (🔴 Left Port Red vs. 🔵 Right Starboard Blue)**:
   - When an incoming asteroid closes within interception danger range, the UFO's combat computer projects the intercept vector onto its local coordinate frame:
     - **🔴 Port Defense (Left Flank Threat, $\text{localX} < 0$)**:
       - **Hull Light**: Emits a vivid ruby-red flash on the **Left Red Light** aperture at $(-0.2656w, +0.1094h)$.
       - **Muzzle & Bolt**: Discharges a high-velocity **Ruby-Red defensive bolt** (`#ff1744`) from the port emitter.
       - **Impact**: Asteroid detonates in a radiant burst of ruby-red spark particles.
     - **🔵 Starboard Defense (Right Flank Threat, $\text{localX} \ge 0$)**:
       - **Hull Light**: Emits a vivid royal-blue flash on the **Right Blue Light** aperture at $(+0.2656w, +0.1094h)$ (matching `#1761f2` on `enemyship.png`).
       - **Muzzle & Bolt**: Discharges a high-velocity **Royal-Blue defensive bolt** (`#1761f2`) from the starboard emitter.
       - **Impact**: Asteroid detonates in a radiant burst of royal-blue spark particles.

---

---

## 22. UFO Economy, Destruction Rewards & Tactical Cover

Shooting down an enemy UFO rewards skillful play through score and the **Energy Siphon** system (`applyUFOSiphon()` in `game.js`):

* **Score Bonus**: **+5 Score Points**.
* **Energy Siphon**: Restores **exactly +10% system energy** across your ship's active modules:
  * **Shared Reactor Mode**: **+10%** battery energy (`energy += 10`).
  * **Shield Charger (Shield-Only) Mode**: **+10%** shield capacitor energy (`shieldEnergy += 10`).
  * **Dual Capacitor Mode**: **+5%** weapon energy and **+5%** shield energy (`energy += 5, shieldEnergy += 5`).

### Tactical Interception & Cover Dynamics
- **Asteroid Obliteration**: All UFO bullets—including direct emerald green lasers (`#00ff8e`), predictive violet lasers (`#c084fc`), port red CIWS bolts (`#ff1744`), and starboard blue CIWS bolts (`#1761f2`)—detonate any asteroid they hit upon impact with matching colored spark explosions.
- **Defensive CIWS Interceptions**: When an asteroid closes in on the UFO, its CIWS bolts vaporize the rock with matching red or blue particle explosions, clearing space in dramatic fashion.
