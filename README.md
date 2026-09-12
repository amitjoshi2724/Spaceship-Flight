# 🚀 Spaceship Flight

[![Play Online](https://img.shields.io/badge/Play_Live-GitHub_Pages-00f0ff?style=for-the-badge&logo=github)](https://amitjoshi2724.github.io/Spaceship-Flight/)
[![Author](https://img.shields.io/badge/Created_by-Amit_Joshi_(@amitjoshi2724)-facc15?style=for-the-badge&logo=github)](https://github.com/amitjoshi2724)
[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge)](LICENSE)

A modern, responsive web recreation of **Spaceship Flight**, an arcade space shooter originally built in **2016** by **Amit Joshi ([@amitjoshi2724](https://github.com/amitjoshi2724))** as a high school computer science project. 

The original codebase featured both a **Java Swing desktop application** and a native **Android Studio mobile app**. This present-day web version faithfully ports the core mechanics, original sprites, and collision mathematics to **HTML5 Canvas**, **Vanilla JavaScript**, and the **Web Audio API**, hosted directly on **GitHub Pages**.

🎮 **[Play Spaceship Flight Live in Your Browser](https://amitjoshi2724.github.io/Spaceship-Flight/)**

---

## 🕹️ Controls

The game includes seamless dual-input support for both desktop keyboards/mice and mobile touchscreens:

### 💻 Desktop Controls
| Action | Key / Input | Description |
| :--- | :--- | :--- |
| **Rotate Ship** | `←` / `→` or `A` / `D` | Continuous rotational steering |
| **Thrust Engine** | `↑` or `W` | Accelerates ship forward and fires exhaust plumes |
| **Fire Lasers** | `Spacebar`, `L`, or Left Click | Shoots glowing golden plasma bullets |
| **Pause / Resume** | `P` or `Escape` | Toggles the pause and settings menu |

### 📱 Mobile & Touch Controls
- **Steering:** Tap the on-screen counter-clockwise **[ ↺ < ]** and clockwise **[ ↻ > ]** looped arrow buttons in the lower-left corner.
- **Thrust:** Tap & hold the on-screen **[THRUST]** button, or touch & hold anywhere on the canvas.
- **Fire:** Tap the on-screen **[FIRE]** button, or tap anywhere on the playfield.
- **Pause / Play:** Tap **[ \| \| ]** in the top-right corner to pause (switches dynamically to **[ ▶ ]** when paused).

---

## 📲 Install as an App & Play Offline (iOS & Android)

**Spaceship Flight** is built as a full **Progressive Web App (PWA)** powered by a dedicated **Service Worker (`sw.js`)** and Web App Manifest (`manifest.json`). 

Once installed to your smartphone's home screen:
- ✈️ **100% Offline Playable:** All game logic, physics, procedural Web Audio synthesizers, and ship sprites are pre-cached directly to persistent device storage via the **Cache Storage API**. You can play in Airplane Mode with zero Wi-Fi or cellular data anytime, anywhere.
- 📱 **Native Fullscreen Experience:** Launches in standalone mode without browser address bars, URL fields, or tabs.
- 🔄 **Zero-Hassle Background Updates:** When you connect to Wi-Fi, the Service Worker automatically fetches and updates any new changes pushed to GitHub.

### 🍏 iPhone & iPad (iOS Safari)
1. Open **[https://amitjoshi2724.github.io/Spaceship-Flight/](https://amitjoshi2724.github.io/Spaceship-Flight/)** in **Safari**.
2. Tap the **Share** button at the bottom of the screen (the square with an arrow pointing upward).
3. Scroll down the share sheet and tap **"Add to Home Screen"**.
4. Tap **Add** in the top-right corner. A dedicated red spaceship icon will appear on your home screen.
5. Tap the new icon once while online to let the Service Worker cache all assets—after that, it is permanently playable offline!

### 🤖 Android (Google Chrome)
1. Open **[https://amitjoshi2724.github.io/Spaceship-Flight/](https://amitjoshi2724.github.io/Spaceship-Flight/)** in **Google Chrome**.
2. Tap the **three-dots menu (⋮)** in the top-right corner.
3. Tap **"Install app"** (or **"Add to Home screen"**).
4. Tap **Install** on the prompt. The game will install directly to your home screen and app drawer as an offline-ready arcade app.

---

## ✨ Features & Enhancements

### 1. Animated Thruster Fire
When accelerating (gas is pressed), the spaceship automatically renders animated exhaust flames underneath the ship, alternating between the original 2016 sprites `newspaceshipmoving.png` and `newspaceshipmoving2.png` for an authentic rocket plume effect, accompanied by dynamic particle exhaust.

### 2. Adaptive Spaceship & Controls Sizing
- **Adaptive Screen-Height Ratio:** Spaceship dimensions scale dynamically based on the actual playable game arena height rather than rigid static pixels, keeping game proportions balanced on desktop displays, iPads, and iPhones alike.
- **Customizable Sizing Sliders:** Fine-tune your ship size from **70% to 130%** (default 100%) and on-screen button sizes from **54px to 96px** (default 72px) in the Settings modal to match your personal ergonomic preferences.

### 3. Background Starfield Toggle
Enjoy a procedural multi-layered parallax starfield with gentle twinkling that responds to your ship's velocity, with the option to turn stars off in Settings for a pure, deep-space void.

### 4. Clean Plasma Laser Bullets
In the original 2016 Android app, a blue dot had been placed in the center of bullets as a build test. In this version, bullets are pure, brilliant golden yellow bolts with vibrant outer bloom.

### 5. Authentic Physics & Exact 12-Point Polygon Collision
- **5 Varied Asteroid Shapes:** In addition to Amit's original 2016 5-point polygon from `RockMaker.java` (`[0, 25, 15, -5, -8]`, `[0, 5, 30, 25, 15]`), asteroids feature a handful of distinct space rock shapes (jagged crags, diamond asteroids, chunky meteorites, and elongated boulders) randomly chosen upon spawn.
- **Exact 12-Point Polygon-vs-Polygon Collision:** Replaces single-point checks with a 12-point oriented polygon that traces the rocket's exact pixel boundaries (nose antenna, head-to-body shoulders, wing roots, outer wingtips, inner notches, and flared tail fins). Tests line-segment crossings and containment against rotating asteroid polygons, eliminating ghost passes and near-miss bugs.
- **Inertial Flight Dynamics & Strict Cleanup:** Authentic drift damping (`dx *= 0.992, dy *= 0.992`), velocity cap, targeted trajectories toward the screen, and immediate memory cleanup of off-screen bullets and asteroids to guarantee zero lag.

### 6. Power & Shield Systems (3 Game Modes)
Tailor your arcade combat experience with three distinct energy management systems selectable in Settings:

| Game Mode | Ammo Battery | Shield Capacitor | Debt Allowed? | Combat Siphon (Per Rock Destroyed) |
| :--- | :--- | :--- | :--- | :--- |
| **Shared Reactor** *(Default)* | 100% max (15/shot) | Shares main battery (50% cost) | **No** (requires ≥50% charge) | **+6%** to shared battery |
| **Dual Capacitors** | 100% max (15/shot) | Dedicated 100% capacitor (5%/s) | **No** (requires 100% full charge) | **+3%** to ammo battery **AND** **+3%** to shield |
| **Shield Charger** | **Unlimited** (free lasers) | Dedicated 100% capacitor (2%/s) | **No** (requires 100% full charge) | **+3%** to shield capacitor |

#### Mode Breakdown & Combat Siphon:
- **Shared Reactor (Tactical Resource Trade-Off):**
  A single power plant routes power to both laser cannons and the emergency invulnerability shield. Features **Kinetic Dynamo** recharging (12.5%/sec idle, accelerating by 1.6x to 20%/sec while thrusting). Deploying the emergency shield consumes **50% energy** and strictly requires at least 50% charge to activate (no negative debt). Shielding at full battery leaves 50% energy (3 laser shots ready) so you are never left defenseless. Destroying asteroids siphons **+6% energy** back to the reactor.
- **Dual Capacitors (Tactical Weapon & Defense Separation):**
  Splits power into independent **Ammo Battery** and **Shield Capacitor** gauges displayed side-by-side on the HUD. Weapons recharge via the **Kinetic Dynamo** (12.5%/sec idle, 20%/sec while thrusting), while the shield recharges passively at **5%/second** (20s full charge). The emergency shield requires a full 100% charge to deploy (no debt). Destroying asteroids rewards tactical play by siphoning **+3% to ammo AND +3% to shield** simultaneously.
- **Shield Charger (Casual / Unlimited Ammo):**
  Plasma laser cannons fire freely with infinite ammo. The shield capacitor recharges passively at **2%/second** (50s full charge) with recharging paused during active shield protection. Destroying asteroids awards **+3% shield energy** per rock, rewarding sharpshooters with faster defense recovery while preventing spam exploits.

### 7. Difficulty Modes
Configure your challenge level directly in Settings:
- **Easy (Casual):** Relaxed spawn rate, lower speed multiplier, max 8 concurrent asteroids.
- **Medium (Standard):** Balanced arcade gameplay with up to 14 concurrent asteroids.
- **Hard (Asteroid Storm):** Fast-paced spawn interval (~0.63s), 1.75x velocity boost, and up to 22 concurrent asteroids.

### 8. Non-Obstructing Transparent Controls & Electric Blue Lives
- **Clear Field of View:** Control buttons and HUD statistics float seamlessly above space with no opaque background bars, ensuring full visibility of approaching asteroids across the entire screen.
- **Electric Blue Lives:** Crisp, glowing electric blue arrowheads represent remaining ship hulls in the HUD.

### 9. Procedural Synthesizer Audio
Built using the Web Audio API with zero external audio assets:
- Laser cannon discharge with exponential pitch sweep
- Low-frequency engine rumble during thrust
- Filtered white-noise explosions upon destroying asteroids
- Retro 8-bit descending arpeggio on game over

### 10. Customization & Persistence
- **Ship Skin Selection:** Choose between Classic Crimson (`images/newspaceship.png`) and Cobalt Blue (`images/bluenewspaceship.png`).
- **On-Ship Status Bars Toggle:** Toggle real-time vertical ammo and shield status bars flanking your ship on or off.
- **High Score Tracking:** Automatically persists your personal best record in browser `localStorage`.
- **Favicon:** Configured with the classic red spaceship icon.

---

## 📚 Technical Documentation & AI Guides

The repository includes comprehensive, mathematical textbook-grade engineering guides designed for both game development and machine learning research:

1. 🎮 **[Arcade AI & Physics Mathematics Guide](docs/ARCADE_AI_GUIDE.md):**
   - 16 detailed mathematical sections with complete step-by-step derivations.
   - Topics include **Unified Context Steering**, **Ray-Cast Horizon Avoidance**, **Quadratic Lead-Pursuit Interception**, **Danmaku Bullet Patterns**, and **12-Point Polygon SAT Collision Detection**.
2. 🧠 **[Reinforcement Learning for Spaceship Flight](docs/REINFORCEMENT_LEARNING_GUIDE.md):**
   - Deep dive into autonomous agent training via Deep Reinforcement Learning.
   - Theoretical comparison of **SARSA (On-Policy)** vs. **Q-Learning / DQN (Off-Policy)** vs. **PPO (Actor-Critic)** with the classic Cliff Walking intuition.
   - Solutions to the **Toroidal Screen-Wrapping Trap** (minimum image convention), **Egocentric Coordinate Transforms**, and **LIDAR Observation Spaces**.
   - Complete end-to-end code for a headless **Python Gymnasium Simulator** (`spaceship_env.py`), **Stable-Baselines3 PPO Training**, and **ONNX / TensorFlow.js In-Browser Inference**.

---

## 📂 Repository Structure

```
Spaceship-Flight/
├── index.html                   # Modern HTML5 game canvas and glassmorphic UI
├── style.css                    # Retro sci-fi theme stylesheet and responsive HUD
├── game.js                      # Core game loop, physics engine, audio synth, & controls
├── sw.js                        # Offline-first Service Worker cache engine
├── manifest.json                # PWA web app manifest for home screen install
├── README.md                    # Project overview & documentation
├── LICENSE                      # MIT License
│
├── docs/                        # Comprehensive technical guides & mathematical documentation
│   ├── ARCADE_AI_GUIDE.md       # Complete 16-section mathematical guide to classical arcade AI
│   ├── REINFORCEMENT_LEARNING_GUIDE.md # Deep RL guide: MDP math, SARSA vs Q-Learning, PPO, & PyTorch code
│   └── archive/                 # Implementation plans & development logs
│
├── images/                      # Sprites, icons, and visual assets
│   ├── newspaceship.png         # Classic Crimson spaceship sprite
│   ├── newspaceshipmoving.png   # Animated thrust fire frame 1
│   ├── newspaceshipmoving2.png  # Animated thrust fire frame 2
│   ├── bluenewspaceship.png     # Cobalt Blue spaceship sprite
│   ├── bluenewspaceshipmoving2.png # Cobalt Blue thrust sprite
│   ├── enemyship.png            # Hostile UFO sprite
│   └── amitjoshi2724_pfp.png    # Author avatar
│
├── java-swing/                  # Original 2016 Java Swing desktop edition
│   └── SpaceshipDriver.java     # Complete standalone Java desktop game
│
└── android-2017/                # Original 2016-2017 native Android Studio mobile project
    ├── app/src/main/java/       # Android Java source (MainActivity, RockMaker, etc.)
    └── app/src/main/res/        # Android layouts, drawables, and mipmap icons
```

---

## 👨‍💻 Author & Credits

- **Developer:** Amit Joshi ([@amitjoshi2724](https://github.com/amitjoshi2724))
- **Support on Ko-fi:** [![Support on Ko-fi](https://img.shields.io/badge/Support_on-Ko--fi-ff5e5b?style=flat-square&logo=kofi&logoColor=white)](https://ko-fi.com/I2I81CDN0L)
- **Original Release:** 2016 (Java Swing Desktop & Android App)
- **Web Modernization:** 2026 (HTML5 / Canvas / Web Audio / GitHub Pages)

Licensed under the [MIT License](LICENSE).
