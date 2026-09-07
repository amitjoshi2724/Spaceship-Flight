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

### 5. Authentic Physics & Dynamic Asteroid Variations
- **5 Varied Asteroid Shapes:** In addition to Amit's original 2016 5-point polygon from `RockMaker.java` (`[0, 25, 15, -5, -8]`, `[0, 5, 30, 25, 15]`), asteroids now feature a handful of distinct space rock shapes (jagged crags, diamond asteroids, chunky meteorites, and elongated boulders) randomly chosen upon spawn.
- **Ray-Casting Collision Algorithm:** Accurately ports the point-in-polygon ray-casting test from `Polygon.java` (`rayCastIntersect`).
- **Inertial Flight Dynamics & Strict Cleanup:** Authentic drift damping (`dx *= 0.992, dy *= 0.992`), velocity cap, targeted trajectories toward the screen, and immediate memory cleanup of off-screen bullets and asteroids to guarantee zero lag.

### 6. Difficulty Modes
Configure your challenge level directly in Settings:
- **Easy (Casual):** Relaxed spawn rate, lower speed multiplier, max 8 concurrent asteroids.
- **Medium (Standard):** Balanced arcade gameplay with up to 14 concurrent asteroids.
- **Hard (Asteroid Storm):** Fast-paced spawn interval (~0.63s), 1.75x velocity boost, and up to 22 concurrent asteroids.

### 7. Non-Obstructing Transparent Controls & Electric Blue Lives
- **Clear Field of View:** Control buttons and HUD statistics float seamlessly above space with no opaque background bars, ensuring full visibility of approaching asteroids across the entire screen.
- **Electric Blue Lives:** Crisp, glowing electric blue arrowheads represent remaining ship hulls in the HUD.

### 8. Procedural Synthesizer Audio
Built using the Web Audio API with zero external audio assets:
- Laser cannon discharge with exponential pitch sweep
- Low-frequency engine rumble during thrust
- Filtered white-noise explosions upon destroying asteroids
- Retro 8-bit descending arpeggio on game over

### 9. Customization & Persistence
- **Ship Skin Selection:** Choose between Classic Crimson (`newspaceship.png`) and Cobalt Blue (`bluenewspaceship.png`).
- **High Score Tracking:** Automatically persists your personal best record in browser `localStorage`.
- **Favicon:** Configured with the classic red spaceship icon.

---

## 📂 Repository Contents

```
Spaceship-Flight/
├── index.html                   # Modern HTML5 game canvas and glassmorphic UI
├── style.css                    # Retro sci-fi theme stylesheet and responsive HUD
├── game.js                      # Core game loop, physics engine, audio synth, & controls
├── sw.js                        # Offline-first Service Worker cache engine
├── manifest.json                # PWA web app manifest for home screen install
├── README.md                    # Project documentation & guides
├── .gitignore                   # Git configuration excluding OS and build caches
│
├── newspaceship.png             # Original 2016 Red/White spaceship sprite
├── newspaceshipmoving.png       # Original 2016 Thrust sprite with extended fire
├── newspaceshipmoving2.png      # Original 2016 Thrust sprite with fire
├── bluenewspaceship.png         # Original 2016 Blue spaceship sprite
├── bluenewspaceshipmoving2.png  # Original 2016 Blue thrust sprite with fire
│
├── SpaceshipDriver.java         # Original 2016 Java Swing desktop source code
└── SpaceshipFlight/             # Original 2016 Android Studio project
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
