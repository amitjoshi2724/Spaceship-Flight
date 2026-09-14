# Implementation Plan: Asteroidle — The Ballistic Daily Puzzle

A daily Wordle-variant targeting game based on *Spaceship Flight*, hosted at `/asteroidle`.

---

## 1. Overview & Concept

**Asteroidle** is a daily spatial-reasoning and ballistic-interception puzzle:
- Every day, players face **5 unique asteroid challenges** generated deterministically from the daily seed (`YYYY-MM-DD`).
- In each round:
  1. **1-Second Reconnaissance Clip**: The player watches a 1-second preview of an asteroid drifting and spinning through deep space to deduce its velocity vector, trajectory, and rotational speed.
  2. **Fixed Ship, Variable Heading**: The player's spaceship is positioned at a fixed spatial coordinate $(x, y)$ in the sector. The player cannot move the ship, but can freely rotate and adjust the ship's firing angle.
  3. **Calibrated Bullet Speed**: Projectile velocity is calibrated per challenge (Tiers 1 through 5). The player can use a **"Test Fire"** range mode to observe bullet flight timing before committing.
  4. **The Interception Shot**: Once the 1-second clip ends, the player fires a single bullet from the nose cannon. Both the bullet and the asteroid continue along their physical paths in continuous simulation.
  5. **Precision Scoring (0–100 per asteroid, 500 max)**:
     - **Direct Hit (Collision Hull Intersect)**: **100 Points** + Asteroid Explosion & Screen Shake.
     - **Near Miss**: Graduated score based on intelligent normalized proximity (see discussion below).
  6. **Daily & Unlimited Modes**: Complete with Mastermindle-style **Daily Archive** (calendar view), **Stats Modal** with Wordle-style emoji score share, **Help Modal**, and **Google Sign-In** with Firestore cloud sync.

---

## 2. Core Discussion: Intelligent Scoring vs. Raw Pixels

The user noted:
> *"if u hit it - then 100. otherwise max(0, 100 - pixels away at closest meet) except it shouldnt be pixels it should be like smth more intelligent idk lets discuss."*

### The Problem with Raw Pixels
1. **Device Resolution Bias**: On a 375px mobile screen, a 50px miss is 13.3% of the viewport width. On a 1920px desktop monitor, 50px is only 2.6%. A raw pixel deduction severely penalizes mobile players.
2. **Asteroid Scale Distortion**: Asteroids range in size (radius $R \approx 18\text{px}$ to $40\text{px}$). Missing the center of a giant boulder by 42px is a 2px razor-thin grazing near-miss. Scoring it as $100 - 42 = 58$ fails to reward great aim.

### Proposed Solution: Normalized Surface Proximity & Angular Tolerance (Recommended)

We measure the **closest approach distance between the bullet's swept capsule and the asteroid's actual polygon perimeter** ($d_{\text{surface}}$):

$$\text{Miss Ratio } M = \frac{d_{\text{surface}}}{R_{\text{asteroid}}}$$

- **Direct Hit** ($d_{\text{surface}} \le 0$): **100 Points**
- **Near Miss** ($0 < d_{\text{surface}} \le 3 \times R_{\text{asteroid}}$):
  $$\text{Score} = \text{round}\left( 100 \times \left(1 - \frac{M}{3}\right)^{1.5} \right)$$
  - Grazing near-miss ($0.1 R$ away): **95–98 Points**
  - Close shave ($0.5 R$ away): **77 Points**
  - Moderate miss ($1.0 R$ away): **54 Points**
  - Distant miss ($2.0 R$ away): **19 Points**
  - Complete whiff ($> 3.0 R$ away): **0 Points**
- **Telemetry Readout**: The game HUD displays the angular error in degrees ($\Delta \theta^\circ$) and closest approach in asteroid radii ("Missed by 0.3x asteroid radii at +1.8°").

---

## 3. Bullet Speed & Calibration (Tiers 1 to 5)

The user noted:
> *"u should be able to test out the bullets to get the bullet speed. i think rn the speed is 3 but let's say the speed of the bullet in asteroidle can range from 1 thru 5 (again not pixels, instead whatever smart thing ur using rn)"*

In *Spaceship Flight*, canonical bullet speed is 14 units/frame (scaled by viewport `sizeFactor`).

In Asteroidle, each round assigns a cannon velocity tier from **1 to 5**:
- **Tier 1 (Sub-Light Kinetic)**: $8.0 \times \text{sizeFactor}$ (heavy lead required)
- **Tier 2 (Standard Plasma)**: $11.0 \times \text{sizeFactor}$
- **Tier 3 (High-Velocity Laser)**: $14.0 \times \text{sizeFactor}$ (standard game speed)
- **Tier 4 (Hyper-Velocity Beam)**: $17.5 \times \text{sizeFactor}$
- **Tier 5 (Tachyon Railgun)**: $21.0 \times \text{sizeFactor}$ (fast intercept)

### Interactive Calibration Range
- A **"Test Fire"** toggle / button allows the player to fire tracer rounds in real-time across a designated test grid or empty sector before locking in the final shot.
- A **Velocity Gauge** displays the active tier with visual pulses indicating the time-to-target profile.

---

## 4. Code Architecture: Keeping `game.js` 100% Intact as the Single Source of Truth

To ensure `game.js` is **never fractured or splintered** across multiple files:

1. **`game.js` Remains 1 Unified File**:
   - Zero lines of code are moved out of `game.js`.
   - The entire arcade game, classes (`Rock`, `Bullet`, `Spaceship`, `SoundFx`), AI logic, and game loop remain in `game.js` so you can jump in, read, and edit everything in one place.
2. **`window.SpaceshipCore` Namespace**:
   - At the very end of `game.js`, we expose the core reusable classes on a global object:
     ```javascript
     window.SpaceshipCore = {
       Rock,
       Bullet,
       Spaceship,
       SoundFx,
       ParticleSystem,
       getScreenScale
     };
     ```
   - In `game.js`, we ensure `window.gameInstance = new Game()` only boots if `document.getElementById('gameCanvas')` is present on the page.
3. **Asteroidle Consumes `game.js` Directly**:
   - In `/asteroidle/index.html`, we simply include `<script src="../game.js"></script>`.
   - Asteroidle instantly has access to the exact same asteroid shapes, continuous collision detection (CCD swept capsule), particle system, and procedural Web Audio lasers/explosions.
   - **Whenever you tweak rock shapes, collision detection, or audio in `game.js`, Asteroidle immediately inherits those changes with zero duplicate code!**
4. **Asteroidle-Specific Code Stays Inside `/asteroidle/`**:
   - `/asteroidle/` only contains the code unique to Asteroidle: the 1-second clip replay, lead aiming dial, daily 5-asteroid progression, calendar archive, stats modal, and Google Auth.

```
Spaceship-Flight/
├── index.html                   # Classic Spaceship Flight (100% unchanged structure)
├── game.js                      # Unified Single Source of Truth (exports window.SpaceshipCore)
├── asteroidle/
│   ├── IMPLEMENTATION_PLAN.md   # This plan
│   ├── index.html               # Asteroidle Daily & Unlimited Game (loads ../game.js)
│   ├── css/
│   │   ├── asteroidle.css       # Space radar aesthetic, angle dial, clip scrubber
│   │   └── modals.css           # Calendar Archive, Stats histogram, How-to-Play
│   └── js/
│       ├── asteroidle.js        # Core Asteroidle game (clip replay, aiming, test fire, scoring)
│       ├── daily.js             # 5-asteroid daily puzzle manager, streaks, emoji share
│       └── auth.js              # Google Sign-In & Firestore cloud sync (from Mastermindle)
```

---

## 5. Mastermindle-Style Feature Suite

Based on the attached screenshot and `../Mastermind`:

### 1. Top Navigation Bar (Exact Visual Layout)
- `[Play Unlimited Mode]` / `[Play Daily Mode]` toggle
- `[📅 Archive]` Modal trigger
- `[📊 Stats]` Modal trigger
- `[❓ Help]` Modal trigger
- Google Profile Avatar + Name dropdown + `[Sign Out]` button

### 2. Daily Archive Modal (Semantle / Calendar View)
- Interactive calendar grid and list view of past daily puzzles (Puzzle #1 on launch date up to today).
- Status badges:
  - 🟢 **Master Sniper** (450–500 pts)
  - 🟡 **Sharpshooter** (350–449 pts)
  - 🟠 **Cadet** (200–349 pts)
  - ⚪ **Unplayed** / ⏳ **In Progress**
- Click any past date to play that day's puzzle.

### 3. Wordle-Style Statistics & Share Modal
- Lifetime metrics: Games Played, Average Score, High Score, Current Streak, Max Streak.
- Score distribution histogram (brackets: 0–100, 101–200, 201–300, 301–400, 401–500).
- Wordle-style Emoji Share button (copies to clipboard with instant toast):
  ```
  Asteroidle #14 🎯 468/500
  🪨 🟢 100 (Direct Hit!)
  🪨 🟢 100 (Direct Hit!)
  🪨 🟡  92 (Near Miss)
  🪨 🟢 100 (Direct Hit!)
  🪨 🟡  76 (Near Miss)
  https://amitjoshi2724.github.io/Spaceship-Flight/asteroidle
  ```

### 4. How-To-Play Modal
- Illustrated interactive guide demonstrating:
  1. Observing the 1-second asteroid reconnaissance clip.
  2. Test-firing to gauge bullet flight time at the round's speed tier.
  3. Calculating lead angle.
  4. Scoring breakdown.

### 5. Google Sign-In & Offline-First Cloud Storage
- Uses Firebase v10 modular authentication via Google popup.
- Offline-first: Guest scores saved immediately to `localStorage`.
- Cloud sync: When logged in, seamlessly merges and synchronizes stats and puzzle archive history to Firestore at `users/{userId}/asteroidle_history`.

---

## 6. Implementation Stages

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Shared Modules Extraction** | Create `/shared/rock-shapes.js`, `/shared/sound-fx.js`, `/shared/prng.js`, `/shared/firebase-config.js`, `/shared/auth.js`. Verify `game.js` remains 100% operational. |
| **Phase 2** | **Asteroidle Core Engine** | Implement `/asteroidle/js/asteroidle-engine.js`: 1-second clip recording/playback, ship angle controls, test-fire mode, bullet speed tiers 1–5, CCD collision, surface-distance scoring. |
| **Phase 3** | **UI & Audio Experience** | Build `/asteroidle/index.html` & `/asteroidle/css/asteroidle.css`: Radar grid canvas, angle scrub wheel, test fire button, clip replay controls, procedural sound effects. |
| **Phase 4** | **Mastermindle Modals & Daily Mode** | Implement `/asteroidle/js/asteroidle-daily.js`: 5-asteroid progression, Calendar Archive modal, Wordle Stats modal with emoji sharing, How-To-Play modal, countdown to next puzzle. |
| **Phase 5** | **Auth & Cloud Sync** | Connect Google Sign-In and dual-layer LocalStorage + Firestore cloud sync. |
| **Phase 6** | **Verification & Polish** | End-to-end testing of daily puzzles, archive replay, test fire, responsive mobile touch controls, and audio playback. |

---

## 7. Questions for User Confirmation

1. **Scoring Formula**: Does the **Surface Proximity Ratio** formula ($100 \times (1 - \frac{d_{\text{surface}}}{3 R})^{1.5}$, scoring 100 for hit, ~77 for 0.5-radius miss, 0 for $>3R$ miss) match what you had in mind for something "more intelligent than raw pixels"?
2. **Scrubbing/Replay**: During aiming, can players press "Replay Clip" as many times as they want to re-watch the 1-second flight of that asteroid, or should it play once automatically with an optional loop toggle? (We recommend a Replay button and Loop toggle).
3. **Control Style**: For angling the ship, would you prefer dragging an on-screen crosshair/reticle, using Left/Right arrow keys / A-D keys, or a dedicated angle slider/wheel? (We recommend supporting both mouse/touch crosshair aiming and keyboard fine-tuning).
