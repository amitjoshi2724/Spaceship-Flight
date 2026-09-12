# 🛸 UFO (Evil Ship) Unified Implementation Plan

## Executive Overview
Design and integrate an adversarial **UFO (Evil Ship)** into the arcade combat loop using the user-provided [`enemyship.png`](file:///Users/amitjoshi2724/Desktop/Spaceship-Flight/enemyship.png) sprite.

This plan addresses all direct user directives:
1. **Unrestricted Defense & Corridor-Clearing Lasers:** The UFO is **never** left defenseless against asteroids. It features independent firing capabilities: firing at the player ship will **never** lock out its ability to vaporize an asteroid. It blasts asteroids proactively to clear flight paths as well as defensively.
2. **Exact Mathematical Formulation of $I(k)$:** Fully specified 4-component vector utility for radial distance control, lateral strafe/orbit bias, boundary repulsion, and directional inertia.
3. **Triple-Layer Anti-Jitter Architecture:** Directional inertia weighting + switching hysteresis threshold + exponential acceleration smoothing + angular sprite lerp guarantees zero frame-to-frame heading jitter.
4. **Continuous Urgency ($\frac{1}{t_{\text{impact}}}$):** Replaces rigid step-function cutoffs with smooth, distance-and-closure-rate urgency.
5. **100% Screen- & Ship-Relative Scaling:** Zero hardcoded pixel thresholds. All radar ranges, clearance corridors, velocities, and dimensions adapt dynamically to $D_{\text{screen}} = \min(W, H)$ and ship radius $R_{\text{ufo}}$.
6. **20-Point Exact Hull Polygon:** Mapped directly to [`enemyship.png`](file:///Users/amitjoshi2724/Desktop/Spaceship-Flight/enemyship.png) (stacked dome and saucer disc ovals).

---

## Visual Silhouette & Polygon Mapping (`enemyship.png`)

Analysis of [`enemyship.png`](file:///Users/amitjoshi2724/Desktop/Spaceship-Flight/enemyship.png) (32×32 pixel art):
- **Structure:** Cyan/lavender cockpit dome oval sitting atop a wider metallic saucer disc with red, green, and blue navigation lights.
- **Symmetry & Center of Mass:** Horizontally symmetric about $x = 16.0$; visual vertical center spans rows $y \in [6, 22]$ (center $y = 14.0$).
- **Polygon Overlay:** A 20-point boundary polygon hugs both stacked ovals with sub-pixel precision.

![UFO Hull Collision Polygon](/Users/amitjoshi2724/.gemini/antigravity-ide/brain/6b68384d-b1c7-457b-b2c2-c8075b058622/enemyship_polygon_overlay.png)

### Normalized Local Vertices $(x_{\text{norm}} \cdot w, y_{\text{norm}} \cdot h)$ relative to Center $(16.0, 14.0)$:
```javascript
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
```

---

## Mathematical Architecture: Unified Context Steering

### 1. Responsive Coordinate Scaling (No Fixed Pixels)
Let $D_{\text{screen}} = \min(\text{canvas.width}, \text{canvas.height})$:
- **UFO Size:** $w = \text{clamp}(0.085 \cdot D_{\text{screen}}, 36, 72)\text{px}$, $h = w$.
- **Collision Bounding Radius:** $R_{\text{ufo}} = 0.463 \cdot w$.
- **Radar Range:** $R_{\text{radar}} = 6.0 \cdot R_{\text{ufo}}$ ($\approx 0.25 \cdot D_{\text{screen}}$).
- **Clearance Corridor:** $d_{\text{clearance}}(i) = R_{\text{ufo}} + \text{rock}_i\text{.radius} + 0.35 \cdot R_{\text{ufo}}$.
- **Cruising Speed:** $v_{\text{cruise}} = 0.22 \cdot D_{\text{screen}} / \text{sec}$.
- **Thruster Overdrive Speed:** $v_{\text{boost}} = 1.65 \times v_{\text{cruise}}$.
- **Laser Speed:** $v_{\text{laser}} = 0.85 \cdot D_{\text{screen}} / \text{sec}$.

---

### 2. Continuous Urgency Function ($\frac{1}{t_{\text{impact}}}$)
For each asteroid $i$ inside $R_{\text{radar}}$:
1. Relative displacement: $\vec{r}_i = \vec{p}_{\text{rock}, i} - \vec{p}_{\text{ufo}}$.
2. Relative velocity: $\vec{v}_{\text{rel}, i} = \vec{v}_{\text{rock}, i} - \vec{v}_{\text{ufo}}$.
3. Closing velocity: $v_{\text{close}} = -\frac{\vec{r}_i \cdot \vec{v}_{\text{rel}, i}}{\|\vec{r}_i\|}$.
4. If $v_{\text{close}} > 0$ (approaching):
   $$t_{\text{impact}} = \frac{\|\vec{r}_i\|}{v_{\text{close}}}$$
   $$\text{Urgency}_i = \frac{1}{\max(0.12, t_{\text{impact}})}$$
5. If $t_{\text{impact}} < 0.40\text{s}$, set `emergencyOverdrive = true`!

---

### 3. Detailed Formulation of Tactical Interest $I(k)$

For each candidate ray $k \in [0, 15]$ with direction vector $\vec{d}_k = (\cos\theta_k, \sin\theta_k)$:

$$I(k) = w_{\text{player}} \cdot I_{\text{player}}(k) + w_{\text{flank}} \cdot I_{\text{flank}}(k) + w_{\text{boundary}} \cdot I_{\text{boundary}}(k) + w_{\text{inertia}} \cdot I_{\text{inertia}}(k)$$

Weights:
- $w_{\text{player}} = 0.8$
- $w_{\text{flank}} = 0.6$
- $w_{\text{boundary}} = 1.2$
- $w_{\text{inertia}} = 0.7$

#### Component 1: Radial Distance Control $I_{\text{player}}(k)$
- Let $\vec{u}_{\text{player}} = \frac{\vec{p}_{\text{player}} - \vec{p}_{\text{ufo}}}{\|\vec{p}_{\text{player}} - \vec{p}_{\text{ufo}}\|}$ (unit vector towards player).
- Let $d_{\text{player}} = \|\vec{p}_{\text{player}} - \vec{p}_{\text{ufo}}\|$.
- Let $D_{\text{tactical}} \approx 0.40 \cdot D_{\text{screen}}$ be optimal engagement distance.
- The alignment factor is $\alpha_k = \vec{d}_k \cdot \vec{u}_{\text{player}} \in [-1, 1]$:
  $$I_{\text{player}}(k) = \tanh\left(\frac{d_{\text{player}} - D_{\text{tactical}}}{0.18 \cdot D_{\text{screen}}}\right) \times (\vec{d}_k \cdot \vec{u}_{\text{player}})$$
  - When far away ($d > D_{\text{tactical}}$): $\tanh > 0$, so rays pointing toward player score highest.
  - When too close ($d < D_{\text{tactical}}$): $\tanh < 0$, so rays pointing away from player score highest (tactical retreat).

#### Component 2: Flanking / Orbiting Bias $I_{\text{flank}}(k)$
- Let $\vec{u}_{\text{perp}} = (-\vec{u}_{\text{player}.y}, \vec{u}_{\text{player}.x})$ be the perpendicular vector to the player line of sight.
- UFO maintains an orbiting direction $s_{\text{orbit}} \in \{+1, -1\}$ (toggled every 6–10 seconds or when hitting boundaries):
  $$I_{\text{flank}}(k) = s_{\text{orbit}} \times (\vec{d}_k \cdot \vec{u}_{\text{perp}})$$
  - Favors strafing perpendicular to the player, keeping the UFO in evasive lateral motion and making it harder for the player to hit!

#### Component 3: Screen Boundary Cushion $I_{\text{boundary}}(k)$
- Margin: $M_{\text{edge}} = 0.12 \cdot D_{\text{screen}}$.
- For each border (left, right, top, bottom), if the UFO is within $M_{\text{edge}}$, compute an inward repulsion vector $\vec{F}_{\text{inward}}$.
  $$I_{\text{boundary}}(k) = \vec{d}_k \cdot \vec{F}_{\text{inward}}$$
  - Prevents the UFO from cornering itself against screen walls.

#### Component 4: Directional Inertia $I_{\text{inertia}}(k)$ (Anti-Jitter)
- Let $\hat{v}_{\text{current}} = \frac{\vec{v}_{\text{ufo}}}{\|\vec{v}_{\text{ufo}}\|}$ be the current normalized travel vector.
  $$I_{\text{inertia}}(k) = \vec{d}_k \cdot \hat{v}_{\text{current}}$$
  - Rays aligned with current momentum get up to $+1.0$.
  - Perpendicular rays get $0.0$. Opposite rays get $-1.0$.

---

### 4. Danger Evaluation & Combined Ray Utility

#### Danger Score $D(k)$
For each threatening rock $i$ within radar radius $R_{\text{radar}}$:
- Projected closest distance along ray $\vec{d}_k$:
  $$d_{\min}(k, i) = \text{distance from line } (\vec{p}_{\text{ufo}} + t \vec{d}_k) \text{ to rock}_i$$
- If $d_{\min} < d_{\text{clearance}}(i)$:
  $$\text{Danger}_i(k) = \text{Urgency}_i \times \left(1 - \frac{d_{\min}}{d_{\text{clearance}}(i)}\right)^2$$
- $D(k) = \sum_i \text{Danger}_i(k)$.

#### Total Score
$$\text{Score}(k) = I(k) - \lambda \cdot D(k) \quad (\lambda = 3.5)$$

---

### 5. Triple-Layer Anti-Jitter System
To guarantee that the UFO moves with absolute fluidity without frame-by-frame flutter or shaking:

1. **Layer 1: Directional Inertia Bonus ($w_{\text{inertia}} = 0.7$):**
   Already built into $I(k)$ so current heading holds a natural competitive advantage. A new heading must be noticeably safer or better to be chosen.
2. **Layer 2: Switching Hysteresis Threshold ($\Delta_{\text{hysteresis}} = 0.18$):**
   Let $k_{\text{current}}$ be the currently chosen heading. The UFO will NOT switch to a new candidate ray $k_{\text{new}}$ unless:
   $$\text{Score}(k_{\text{new}}) > \text{Score}(k_{\text{current}}) + \Delta_{\text{hysteresis}}$$
   *(Exception: If $D(k_{\text{current}}) > 1.0$—i.e. danger on the current path rises—hysteresis is instantly bypassed for immediate evasion).*
3. **Layer 3: Physical Velocity Steering (No Teleportation):**
   The UFO never snaps its velocity vector instantly. Velocity updates via physical acceleration:
   $$\vec{v}_{\text{desired}} = v_{\text{target}} \cdot \vec{d}_{k^*}$$
   $$\vec{v}_{t+1} = \vec{v}_t + (\vec{v}_{\text{desired}} - \vec{v}_t) \times \text{gain} \times \Delta t \quad (\text{gain} = 5.0/\text{s})$$
   The ship turns gracefully in smooth, organic arcs.
4. **Layer 4: Sprite Bank / Rotation Lerp:**
   Visual rotation angle $\theta_{\text{draw}}$ gently follows the velocity angle with `lerpAngle`:
   $$\theta_{\text{draw}} = \text{lerpAngle}(\theta_{\text{draw}}, \theta_{\text{vel}}, 0.12)$$

---

## Dual-Channel Weapon System: Offensive + Active Asteroid Defense

> [!IMPORTANT]
> The UFO possesses **independent offensive and defensive firing capabilities**. Shooting at the player will **never** leave the UFO unable to defend itself against oncoming asteroids!

### Channel 1: Offensive Cannons (Target: Player Rocket)
- **Rhythm:** Fires an Alien Violet bolt at the player every $\sim 2.0\text{s} - 2.5\text{s}$ (difficulty dependent).
- **Targeting AI:**
  - 50% Direct targeting toward player $(x, y)$.
  - 50% Predictive lead targeting calculating player velocity $(\text{dx}, \text{dy})$ and laser flight time.
- **Post-Shot Jink:** Immediately after firing, triggers a $0.4\text{s}$ thruster burst along the best heading $k^*$ computed by Algorithm 2 to break the player's counter-aim.

### Channel 2: Point-Defense & Corridor-Clearing Cannons (Target: Asteroids)
- **Independent Cooldown:** Rapid cycle ($\approx 0.5\text{s}$ minimum reaction interval).
- **Proactive & Defensive Triggers:**
  - **Path Clearing:** If an asteroid is directly in front of the UFO along its selected steering ray $k^*$ within $3.5 \cdot R_{\text{ufo}}$, the UFO fires a violet bolt to vaporize it and blow the corridor open!
  - **Defensive Intercept:** If any rock has closing urgency $\text{Urgency}_i > 1.2$, the UFO fires a defensive bolt straight at the incoming rock's center of mass.
- **No Conflict:** Even if the UFO fired at the player 100 milliseconds ago, its defensive systems are active and will blast approaching asteroids into space dust!

---

## Combat & Siphon Integration

| Interaction | Result |
| :--- | :--- |
| **Player Laser hits UFO** | UFO destroyed with violet blast particles; awards **+5 Score** and **+10% Combat Siphon** across all game modes. |
| **UFO Laser hits Player** | Inflicts damage / consumes shield; if unshielded, player loses a life. |
| **UFO Laser hits Asteroid** | Asteroid pops into dust and rock fragments. |
| **Asteroid hits UFO** | Mutual destruction: asteroid breaks, UFO explodes. |
| **UFO collides with Player Ship** | Exact polygon-vs-polygon collision check; mutual damage. |

---

## Sound Synthesis
- `playUFOWarning()`: Alien warble / dual-oscillator frequency glide when UFO enters.
- `playUFOLaser()`: Sizzling high-frequency plasma zap.
- `playUFOExplosion()`: Resonant low-frequency rumble with glass-shatter burst.

---

## Verification Plan

### Automated & Interactive Browser Verification
1. **Defensive Shooting Verification:**
   - Place/spawn asteroids along UFO's flight path; confirm UFO shoots and vaporizes them to clear corridors.
   - Fire at player, then immediately observe UFO firing at an incoming rock without artificial lockout.
2. **Anti-Jitter Verification:**
   - Observe UFO trajectory over 30+ seconds across dense rock clusters; confirm movement is smooth and free of rapid flutter.
3. **Sprite & Polygon Verification:**
   - Confirm `enemyship.png` renders sharply with proper aspect ratio and the 20-point collision hull detects grazing hits.
4. **Offensive & Predictive Lead Verification:**
   - Confirm UFO fires Alien Violet lasers directly when player is still, and leads ahead when player is thrusting.
5. **Post-Shot Evasion:**
   - Verify UFO engages a thruster burst along Algorithm 2's best ray immediately after firing.
6. **Scoring & Combat Siphon:**
   - Shoot UFO $\implies$ verify $+5$ score points and $+10\%$ battery/shield siphon.
   - Bait UFO into asteroid $\implies$ verify mutual destruction.
