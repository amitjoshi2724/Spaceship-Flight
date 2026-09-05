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
- **Steering:** Use the on-screen **[◀]** and **[▶]** buttons in the lower-left corner (matching the original 2016 Android layout).
- **Thrust:** Tap & hold the on-screen **[THRUST]** button, or touch & hold anywhere on screen.
- **Fire:** Tap the on-screen **[FIRE]** button, or tap anywhere on the playfield.
- **Pause:** Tap **[ \| \| ]** in the top-right corner.

---

## ✨ Features & Enhancements

### 1. Animated Thruster Fire
When accelerating (gas is pressed), the spaceship automatically renders animated exhaust flames underneath the ship, alternating between the original 2016 sprites `newspaceshipmoving.png` and `newspaceshipmoving2.png` for an authentic rocket plume effect, accompanied by dynamic particle exhaust.

### 2. Customizable Spaceship Size
Adjust the spaceship's dimensions to your preference in the **Settings** menu using the sizing slider (ranging from **36px** up to **76px**, with a default size of **54px**). Collision boundaries and exhaust offsets dynamically scale with the ship.

### 3. Background Starfield Toggle
Enjoy a procedural multi-layered parallax starfield with gentle twinkling that responds to your ship's velocity, with the option to turn stars off in Settings for a pure, deep-space void.

### 4. Clean Plasma Laser Bullets
In the original 2016 Android app, a blue dot had been placed in the center of bullets as a build test. In this version, bullets are pure, brilliant golden yellow bolts with vibrant outer bloom.

### 5. Authentic 2016 Physics & Geometry
- **5-Vertex Polygon Asteroids:** Preserves the exact 5-point polygon geometry from `RockMaker.java` (`xpoints = [0, 25, 15, -5, -8]`, `ypoints = [0, 5, 30, 25, 15]`).
- **Ray-Casting Collision Algorithm:** Accurately ports the point-in-polygon ray-casting test from `Polygon.java` (`rayCastIntersect`).
- **Inertial Flight Dynamics:** Authentic drift damping (`dx *= 0.992, dy *= 0.992`), velocity cap, and toroidal screen-edge wrapping.

### 6. Procedural Synthesizer Audio
Built using the Web Audio API with zero external audio assets:
- Laser cannon discharge with exponential pitch sweep
- Low-frequency engine rumble during thrust
- Filtered white-noise explosions upon destroying asteroids
- Retro 8-bit descending arpeggio on game over

### 7. Customization & Persistence
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
- **Original Release:** 2016 (Java Swing Desktop & Android App)
- **Web Modernization:** 2026 (HTML5 / Canvas / Web Audio / GitHub Pages)

Licensed under the [MIT License](LICENSE).
