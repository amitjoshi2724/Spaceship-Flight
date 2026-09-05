# 🚀 Spaceship Flight

A modern web-playable recreation of **Spaceship Flight**, an arcade space shooter originally created in **2016** by **Amit Joshi ([@amitjoshi2724](https://github.com/amitjoshi2724))** in high school as both a Java Swing desktop application and an Android mobile game.

Now preserved and modernized in HTML5 Canvas and JavaScript with Web Audio, deployed directly on **GitHub Pages**.

🎮 **[Play Live on GitHub Pages](https://amitjoshi2724.github.io/Spaceship-Flight/)**

---

## 🕹️ Controls

Seamlessly supports both **Desktop Keyboard/Mouse** and **Mobile Touchscreens**:

### 💻 Desktop Controls
| Action | Key / Input |
| :--- | :--- |
| **Rotate Ship** | `←` / `→` or `A` / `D` |
| **Thrust Engine** (Fire beneath ship) | `↑` or `W` |
| **Fire Laser** | `Spacebar`, `L`, or Left Mouse Click |
| **Pause / Resume** | `P` or `Escape` |

### 📱 Mobile / Touch Controls
- **Rotate:** Use the on-screen **[◀]** and **[▶]** buttons in the lower-left corner.
- **Thrust:** Hold down the **[THRUST]** button or touch & hold anywhere on screen.
- **Fire:** Tap the **[FIRE]** button or tap anywhere on the playfield.
- **Pause:** Tap **[ \| \| ]** in the top-right corner.

---

## ✨ Features

- **Thruster Fire Animations**: Automatically displays animated exhaust fire plumes underneath the ship when accelerating (`newspaceshipmoving.png` & `newspaceshipmoving2.png`).
- **Classic Ship Customization**: Switch between the original Crimson ship and Cobalt Blue ship in Settings.
- **Authentic 2016 Geometry & Physics**: Exact 5-vertex rock polygons and ray-cast point-in-polygon collision algorithms ported directly from the original `Polygon.java` and `RockMaker.java`.
- **Procedural Synthesizer Audio**: Retro Web Audio API sound effects for lasers, engine rumble, explosions, and game over (no external audio assets required).
- **Persistent High Scores**: Automatically saves your best records to browser `localStorage`.
- **Dynamic Starfield & Particle FX**: Multi-layered parallax stars, screen shake on impact, and fiery debris explosions.

---

## 📂 Repository Structure

- `index.html` — Main HTML5 entry point and HUD interface
- `style.css` — Modern sci-fi arcade stylesheet and glassmorphic HUD
- `game.js` — Core game engine, physics, audio synth, and rendering
- `newspaceship.png` & `bluenewspaceship.png` — Original 2016 spaceship sprites
- `newspaceshipmoving.png` & `newspaceshipmoving2.png` — Original animated thrust sprites with fire
- `SpaceshipDriver.java` — Original 2016 Java Swing desktop game
- `SpaceshipFlight/` — Original 2016 Android Studio project

---

## 👨‍💻 Author & Credits

- **Creator:** Amit Joshi ([@amitjoshi2724](https://github.com/amitjoshi2724))
- **Original Release:** 2016 (Java Swing & Android)
- **Web Modernization:** 2026 (HTML5 / Canvas / Web Audio)

Licensed under the MIT License.
