(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // asteroidle/js/prng.js
  var EPOCH_DATE_STR = "2024-01-01";
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function createMulberry32(seed) {
    let s = seed >>> 0;
    return function() {
      s = s + 1831565813 >>> 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function getPuzzleNumber(dateStr, epochStr = EPOCH_DATE_STR) {
    const [y1, m1, d1] = dateStr.split("-").map(Number);
    const [y2, m2, d2] = epochStr.split("-").map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.max(1, Math.round((utc1 - utc2) / (1e3 * 60 * 60 * 24)) + 1);
  }
  function getTodayDateStr() {
    return formatDate(/* @__PURE__ */ new Date());
  }
  function generateDailyChallenges(dateStr) {
    const seedVal = hashString(`asteroidle-daily-${dateStr}`);
    const rng = createMulberry32(seedVal);
    const challenges = [];
    const shapes = [0, 1, 2, 3, 4];
    for (let i = shapes.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
    }
    for (let round = 1; round <= 5; round++) {
      const shapeIndex = shapes[round - 1];
      const baseRadius = 18 + rng() * 18;
      const speed = 0.85 + rng() * 0.55;
      const rotSpeed = (rng() - 0.5) * 0.07;
      const tierPool = [2, 3, 4, 1, 5];
      const bulletTier = tierPool[(round - 1) % tierPool.length];
      const side = Math.floor(rng() * 4);
      const sidePos = 0.15 + rng() * 0.7;
      const targetX = 0.25 + rng() * 0.5;
      const targetY = 0.25 + rng() * 0.5;
      const shipX = 0.2 + rng() * 0.6;
      const shipY = 0.2 + rng() * 0.6;
      challenges.push({
        round,
        shapeIndex,
        baseRadius,
        speed,
        rotSpeed,
        bulletTier,
        side,
        sidePos,
        targetX,
        targetY,
        shipX,
        shipY,
        initialHeading: Math.floor(rng() * 360)
      });
    }
    return challenges;
  }

  // asteroidle/js/firebase-config.js
  var _k = atob("QUl6YVN5RG5JMG5FcTBLbTNHR1dRRFR3V1lhN2tiUExJRDNwWXpV");
  var FIREBASE_CONFIG = {
    apiKey: _k,
    authDomain: "mastermind-amitjoshi2724.firebaseapp.com",
    projectId: "mastermind-amitjoshi2724",
    storageBucket: "mastermind-amitjoshi2724.firebasestorage.app",
    messagingSenderId: "790815043624",
    appId: "1:790815043624:web:66f0dc2d1d4dbda06bc51d",
    measurementId: "G-JQP8CHKRGR"
  };
  var app = null;
  var auth = null;
  var db = null;
  var googleProvider = null;
  var isFirebaseSupported = false;
  var initPromise = null;
  function initFirebase() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (typeof window === "undefined" || !window.location || !window.location.protocol || !window.location.protocol.startsWith("http")) {
        return null;
      }
      try {
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getAuth, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: "select_account" });
        isFirebaseSupported = true;
        return { app, auth, db, googleProvider };
      } catch (e) {
        console.warn("Firebase could not be initialized (offline or network restriction):", e);
        return null;
      }
    })();
    return initPromise;
  }

  // asteroidle/js/auth.js
  var firebaseAuth = null;
  var firebaseProvider = null;
  var authFns = null;
  var authListeners = /* @__PURE__ */ new Set();
  var currentAuthUser = null;
  var isInitialized = false;
  (async () => {
    try {
      const fb = await initFirebase();
      if (fb && fb.auth) {
        firebaseAuth = fb.auth;
        firebaseProvider = fb.googleProvider;
        authFns = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        authFns.onAuthStateChanged(firebaseAuth, (user) => {
          currentAuthUser = user;
          isInitialized = true;
          renderAuthUI(user);
          authListeners.forEach((cb) => {
            try {
              cb(user);
            } catch (e) {
              console.error("Error in auth listener:", e);
            }
          });
        });
        return;
      }
    } catch (e) {
      console.warn("Firebase Auth unavailable:", e);
    }
    isInitialized = true;
    renderAuthUI(null);
  })();
  async function signInWithGoogle() {
    if (!firebaseAuth || !authFns) {
      if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
        alert("Google Cloud Sync requires running via a local web server (e.g. http://localhost:8080/ or GitHub Pages). All stats and streaks are safely saved locally in your browser!");
      } else {
        alert("Cloud services are currently offline. Your puzzle progress is saved locally.");
      }
      return null;
    }
    try {
      const result = await authFns.signInWithPopup(firebaseAuth, firebaseProvider);
      return result.user;
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        console.log("User closed Google Sign-In popup.");
        return null;
      }
      if (error.code === "auth/unauthorized-domain") {
        alert("Domain unauthorized. Please ensure this domain is added to Authorized Domains in the Firebase Console.");
        return null;
      }
      console.error("Google Sign-In Error:", error);
      alert(`Sign in failed: ${error.message}`);
      return null;
    }
  }
  async function signOutUser() {
    if (authFns && firebaseAuth) {
      try {
        await authFns.signOut(firebaseAuth);
      } catch (error) {
        console.error("Sign Out Error:", error);
      }
    } else {
      currentAuthUser = null;
      renderAuthUI(null);
    }
  }
  function onAuthChange(callback) {
    authListeners.add(callback);
    if (isInitialized) {
      callback(currentAuthUser);
    }
    return () => authListeners.delete(callback);
  }
  function getCurrentUser() {
    return currentAuthUser;
  }
  function renderAuthUI(user) {
    const authContainer = document.getElementById("auth-container");
    if (!authContainer) return;
    if (!user) {
      authContainer.innerHTML = `
            <button id="google-login-btn" class="auth-btn google-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 6px; flex-shrink: 0;">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with Google
            </button>
        `;
      const loginBtn = document.getElementById("google-login-btn");
      if (loginBtn) {
        loginBtn.addEventListener("click", signInWithGoogle);
      }
    } else {
      const photoUrl = user.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
      const displayName = user.displayName || user.email || "Cadet";
      authContainer.innerHTML = `
            <div class="user-auth-widget">
                <div id="user-info-btn" class="user-profile-badge" tabindex="0" aria-haspopup="true" aria-expanded="false">
                    <img id="user-avatar" src="${photoUrl}" alt="${displayName}" class="user-avatar-img">
                    <span id="user-display-name" class="user-display-name">${displayName}</span>
                    <span class="dropdown-caret">\u25BC</span>
                </div>
                <div id="identity-dropdown" class="user-dropdown-menu">
                    <div class="dropdown-header">
                        <span class="account-title">PILOT PROFILE</span>
                        <span class="user-email-subtitle">${user.email || ""}</span>
                    </div>
                    <button id="signout-btn" class="dropdown-item signout-btn">Sign Out</button>
                </div>
            </div>
        `;
      const userInfoBtn = document.getElementById("user-info-btn");
      const dropdown = document.getElementById("identity-dropdown");
      const signoutBtn = document.getElementById("signout-btn");
      if (userInfoBtn && dropdown) {
        userInfoBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = dropdown.classList.contains("active");
          dropdown.classList.toggle("active", !isOpen);
          userInfoBtn.setAttribute("aria-expanded", String(!isOpen));
        });
        document.addEventListener("click", (e) => {
          if (!authContainer.contains(e.target)) {
            dropdown.classList.remove("active");
            userInfoBtn.setAttribute("aria-expanded", "false");
          }
        });
      }
      if (signoutBtn) {
        signoutBtn.addEventListener("click", signOutUser);
      }
    }
  }

  // asteroidle/js/storage.js
  var firestoreDb = null;
  var firestoreFns = null;
  (async () => {
    try {
      const fb = await initFirebase();
      if (fb && fb.db) {
        firestoreDb = fb.db;
        firestoreFns = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      }
    } catch (e) {
      console.warn("Firestore unavailable, running in local-storage-only mode:", e);
    }
  })();
  var STATS_KEY = "asteroidle_stats_v1";
  var HISTORY_KEY = "asteroidle_history_v1";
  var ACTIVE_KEY = "asteroidle_active_state_v1";
  var DEFAULT_STATS = {
    played: 0,
    won: 0,
    // Solved with score >= 350
    currentStreak: 0,
    maxStreak: 0,
    totalScore: 0,
    highScore: 0,
    lastPlayedDate: null,
    distribution: {
      "0-100": 0,
      "101-200": 0,
      "201-300": 0,
      "301-400": 0,
      "401-500": 0
    }
  };
  var memoryStats = loadLocalStats();
  var memoryHistory = loadLocalHistory();
  var firestoreUnsubscribe = null;
  var storageChangeListeners = /* @__PURE__ */ new Set();
  function loadLocalStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        return { ...DEFAULT_STATS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error("Failed to parse local stats:", e);
    }
    return { ...DEFAULT_STATS };
  }
  function loadLocalHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to parse local history:", e);
    }
    return {};
  }
  function saveLocalStats(stats) {
    memoryStats = { ...stats };
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
    } catch (e) {
      console.error("Failed to save local stats:", e);
    }
    syncToCloud();
    notifyListeners();
  }
  function recordDailyCompletion(dateStr, puzzleNum, roundScores, totalScore) {
    const record = {
      dateStr,
      puzzleNum,
      roundScores,
      totalScore,
      completed: true,
      timestamp: Date.now()
    };
    memoryHistory[dateStr] = record;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) {
      console.error("Failed to save history locally:", e);
    }
    const stats = { ...memoryStats };
    stats.played += 1;
    stats.totalScore += totalScore;
    if (totalScore > stats.highScore) {
      stats.highScore = totalScore;
    }
    if (totalScore >= 350) {
      stats.won += 1;
    }
    const today = dateStr;
    if (!stats.lastPlayedDate) {
      stats.currentStreak = 1;
    } else {
      const prev = new Date(stats.lastPlayedDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr - prev) / (1e3 * 60 * 60 * 24));
      if (diffDays === 1) {
        stats.currentStreak += 1;
      } else if (diffDays > 1) {
        stats.currentStreak = 1;
      }
    }
    stats.lastPlayedDate = today;
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }
    if (totalScore <= 100) stats.distribution["0-100"] += 1;
    else if (totalScore <= 200) stats.distribution["101-200"] += 1;
    else if (totalScore <= 300) stats.distribution["201-300"] += 1;
    else if (totalScore <= 400) stats.distribution["301-400"] += 1;
    else stats.distribution["401-500"] += 1;
    saveLocalStats(stats);
    clearActiveState(dateStr);
  }
  function saveActiveState(dateStr, round, scores) {
    try {
      const payload = { dateStr, round, scores, timestamp: Date.now() };
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    } catch (e) {
    }
  }
  function loadActiveState(dateStr) {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.dateStr === dateStr) return data;
      }
    } catch (e) {
    }
    return null;
  }
  function clearActiveState(dateStr) {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.dateStr === dateStr) {
          localStorage.removeItem(ACTIVE_KEY);
        }
      }
    } catch (e) {
    }
  }
  function getStats() {
    return { ...memoryStats };
  }
  function getHistory() {
    return { ...memoryHistory };
  }
  function getRecordForDate(dateStr) {
    return memoryHistory[dateStr] || null;
  }
  function notifyListeners() {
    storageChangeListeners.forEach((cb) => {
      try {
        cb({ stats: memoryStats, history: memoryHistory });
      } catch (e) {
      }
    });
  }
  async function syncToCloud() {
    const user = getCurrentUser();
    if (!user || !firestoreDb || !firestoreFns) return;
    try {
      const userRef = firestoreFns.doc(firestoreDb, "users", user.uid);
      await firestoreFns.setDoc(userRef, {
        asteroidle_stats: memoryStats,
        asteroidle_history: memoryHistory,
        lastUpdated: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync Asteroidle data to Firestore:", e);
    }
  }
  onAuthChange(async (user) => {
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
    if (!user || !firestoreDb || !firestoreFns) return;
    try {
      const userRef = firestoreFns.doc(firestoreDb, "users", user.uid);
      const snap = await firestoreFns.getDoc(userRef);
      if (snap.exists()) {
        const cloudData = snap.data();
        const cloudStats = cloudData.asteroidle_stats || {};
        const cloudHistory = cloudData.asteroidle_history || {};
        const mergedHistory = { ...memoryHistory };
        for (const [date, rec] of Object.entries(cloudHistory)) {
          if (!mergedHistory[date] || rec.totalScore > mergedHistory[date].totalScore) {
            mergedHistory[date] = rec;
          }
        }
        const mergedStats = {
          ...DEFAULT_STATS,
          ...cloudStats,
          played: Math.max(memoryStats.played, cloudStats.played || 0),
          won: Math.max(memoryStats.won, cloudStats.won || 0),
          currentStreak: Math.max(memoryStats.currentStreak, cloudStats.currentStreak || 0),
          maxStreak: Math.max(memoryStats.maxStreak, cloudStats.maxStreak || 0),
          highScore: Math.max(memoryStats.highScore, cloudStats.highScore || 0),
          totalScore: Math.max(memoryStats.totalScore, cloudStats.totalScore || 0),
          distribution: {
            "0-100": (memoryStats.distribution["0-100"] || 0) + (cloudStats.distribution?.["0-100"] || 0),
            "101-200": (memoryStats.distribution["101-200"] || 0) + (cloudStats.distribution?.["101-200"] || 0),
            "201-300": (memoryStats.distribution["201-300"] || 0) + (cloudStats.distribution?.["201-300"] || 0),
            "301-400": (memoryStats.distribution["301-400"] || 0) + (cloudStats.distribution?.["301-400"] || 0),
            "401-500": (memoryStats.distribution["401-500"] || 0) + (cloudStats.distribution?.["401-500"] || 0)
          }
        };
        memoryStats = mergedStats;
        memoryHistory = mergedHistory;
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
        notifyListeners();
        await syncToCloud();
      } else {
        await syncToCloud();
      }
      firestoreUnsubscribe = firestoreFns.onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const updated = docSnap.data();
          if (updated.asteroidle_stats) memoryStats = { ...DEFAULT_STATS, ...updated.asteroidle_stats };
          if (updated.asteroidle_history) memoryHistory = { ...updated.asteroidle_history };
          localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
          localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
          notifyListeners();
        }
      });
    } catch (e) {
      console.warn("Error setting up Firestore storage sync:", e);
    }
  });

  // asteroidle/js/asteroidle.js
  var AsteroidleEngine = class {
    constructor(canvas, onRoundComplete) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.onRoundComplete = onRoundComplete;
      this.core = window.SpaceshipCore || {};
      const SoundFXClass = this.core.SoundFX || class {
      };
      const ParticleSystemClass = this.core.ParticleSystem || class {
      };
      const SpaceshipClass = this.core.Spaceship || class {
      };
      const StarfieldClass = this.core.Starfield || class {
      };
      this.soundFx = new SoundFXClass();
      const savedSound = localStorage.getItem("spaceship_flight_sound");
      if (this.soundFx) this.soundFx.enabled = savedSound === "true";
      this.particles = new ParticleSystemClass();
      this.ship = new SpaceshipClass(this.canvas, this.soundFx, this.particles);
      if (this.ship) this.ship.showStatusBars = false;
      const savedSkin = localStorage.getItem("spaceship_flight_ship_skin") || "red";
      if (this.ship) this.ship.selectedSkin = savedSkin;
      const savedScale = parseInt(localStorage.getItem("spaceship_flight_ship_scale") || "100", 10);
      if (this.ship && typeof this.ship.setScalePercent === "function") {
        this.ship.setScalePercent(savedScale);
      }
      this.starfield = new StarfieldClass(this.canvas);
      this.challenge = null;
      this.rock = null;
      this.rockInitialState = null;
      this.rockClipEndState = null;
      this.keys = {
        left: false,
        right: false
      };
      this.state = "AIMING";
      this.clipDurationFrames = 60;
      this.clipFrame = 0;
      this.loopClip = false;
      this.isPlayingClip = false;
      this.testBullets = [];
      this.interceptBullet = null;
      this.closestDistance = Infinity;
      this.minSurfaceDistance = Infinity;
      this.directHit = false;
      this.roundScore = 0;
      this.resultTelemetry = null;
      this.screenShake = 0;
      this.animId = null;
      this.lastTime = performance.now();
      this.setupInputHandlers();
      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", () => this.resizeCanvas());
      }
      this.loop = this.loop.bind(this);
      this.animId = requestAnimationFrame(this.loop);
    }
    /**
     * Fullscreen responsive canvas matching Spaceship Flight (game.js)
     */
    resizeCanvas() {
      const screenW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const screenH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const isPortrait = screenH > screenW;
      if (isPortrait) {
        this.canvas.width = Math.floor(screenW);
        this.canvas.height = Math.floor(screenW * (9 / 16));
      } else {
        this.canvas.width = Math.floor(screenW);
        this.canvas.height = Math.floor(screenH);
      }
      this.width = this.canvas.width;
      this.height = this.canvas.height;
      if (this.starfield && typeof this.starfield.resize === "function") {
        this.starfield.resize();
      }
      if (this.ship && typeof this.ship.recalculateSize === "function") {
        this.ship.canvas = this.canvas;
        this.ship.recalculateSize();
      }
      if (this.challenge) {
        this.updateEntityPositions();
      }
    }
    setSound(enabled) {
      if (this.soundFx) {
        this.soundFx.enabled = enabled;
        try {
          localStorage.setItem("spaceship_flight_sound", enabled ? "true" : "false");
        } catch (e) {
        }
      }
    }
    setShipSkin(skin) {
      if (this.ship) {
        this.ship.selectedSkin = skin;
        try {
          localStorage.setItem("spaceship_flight_ship_skin", skin);
        } catch (e) {
        }
      }
    }
    setShipScale(scalePercent) {
      if (this.ship && typeof this.ship.setScalePercent === "function") {
        this.ship.setScalePercent(scalePercent);
      }
    }
    /**
     * Load an asteroid challenge for the current round
     */
    loadChallenge(challenge) {
      this.challenge = challenge;
      this.testBullets = [];
      this.interceptBullet = null;
      this.closestDistance = Infinity;
      this.minSurfaceDistance = Infinity;
      this.directHit = false;
      this.roundScore = 0;
      this.resultTelemetry = null;
      this.clipFrame = 0;
      this.updateEntityPositions();
      this.playClip();
    }
    updateEntityPositions() {
      if (!this.challenge) return;
      const W = this.width;
      const H = this.height;
      const ch = this.challenge;
      this.ship.x = ch.shipX * W;
      this.ship.y = ch.shipY * H;
      this.ship.dx = 0;
      this.ship.dy = 0;
      const initialAngle = ch.initialHeading !== void 0 ? ch.initialHeading : Math.floor(Math.random() * 360);
      this.ship.angle = initialAngle;
      this.updateAimUI();
      const RockClass = this.core.Rock;
      if (!RockClass) return;
      this.rock = new RockClass(W, H, ch.speed);
      this.rock.shapeIndex = ch.shapeIndex % 5;
      const baseDimension = Math.min(W, Math.max(450, H * 1.6));
      const sizeFactor = baseDimension / 1e3;
      if (ch.baseRadius) {
        this.rock.radius = ch.baseRadius * sizeFactor;
        this.rock.scale = this.rock.radius / 25;
      }
      const shapes = this.core.ROCK_SHAPES || [
        { x: [0, 25, 15, -5, -8], y: [0, 5, 30, 25, 15] },
        { x: [-18, 6, 26, 18, -8, -24], y: [-20, -26, -6, 22, 26, 6] },
        { x: [0, 20, 28, 12, -10, -26, -16], y: [-28, -14, 8, 26, 22, 2, -18] },
        { x: [-14, 10, 26, 20, 8, -14, -28, -20], y: [-24, -22, -4, 16, 28, 24, 6, -12] },
        { x: [-10, 14, 30, 16, -14, -24], y: [-30, -26, 6, 28, 30, -6] }
      ];
      const chosen = shapes[this.rock.shapeIndex];
      let sumX = 0, sumY = 0;
      for (let i = 0; i < chosen.x.length; i++) {
        sumX += chosen.x[i];
        sumY += chosen.y[i];
      }
      const avgX = sumX / chosen.x.length;
      const avgY = sumY / chosen.y.length;
      this.rock.localPoints = [];
      for (let i = 0; i < chosen.x.length; i++) {
        this.rock.localPoints.push({
          x: (chosen.x[i] - avgX) * this.rock.scale * 1.5,
          y: (chosen.y[i] - avgY) * this.rock.scale * 1.5
        });
      }
      const offset = 30;
      let startX, startY;
      if (ch.side === 0) {
        startX = -this.rock.radius - offset;
        startY = ch.sidePos * H;
      } else if (ch.side === 1) {
        startX = ch.sidePos * W;
        startY = -this.rock.radius - offset;
      } else if (ch.side === 2) {
        startX = W + this.rock.radius + offset;
        startY = ch.sidePos * H;
      } else {
        startX = ch.sidePos * W;
        startY = H + this.rock.radius + offset;
      }
      const targetX = ch.targetX * W;
      const targetY = ch.targetY * H;
      const moveAngle = Math.atan2(targetY - startY, targetX - startX);
      const speedMagnitude = 2.2 * ch.speed * (W / 800);
      this.rock.x = startX;
      this.rock.y = startY;
      this.rock.dx = Math.cos(moveAngle) * speedMagnitude;
      this.rock.dy = Math.sin(moveAngle) * speedMagnitude;
      this.rock.rotation = 0;
      this.rock.rotSpeed = ch.rotSpeed;
      this.rockInitialState = {
        x: startX,
        y: startY,
        dx: this.rock.dx,
        dy: this.rock.dy,
        rotation: 0,
        rotSpeed: this.rock.rotSpeed
      };
      this.rockClipEndState = {
        x: startX + this.rock.dx * this.clipDurationFrames,
        y: startY + this.rock.dy * this.clipDurationFrames,
        dx: this.rock.dx,
        dy: this.rock.dy,
        rotation: this.rock.rotSpeed * this.clipDurationFrames,
        rotSpeed: this.rock.rotSpeed
      };
    }
    /**
     * Replay the 1-second preview clip
     */
    playClip() {
      if (!this.rockInitialState) return;
      this.state = "PREVIEW";
      this.isPlayingClip = true;
      this.clipFrame = 0;
      this.restoreRockState(this.rockInitialState);
    }
    stopClipAtEnd() {
      this.state = "AIMING";
      this.isPlayingClip = false;
      this.clipFrame = this.clipDurationFrames;
      this.restoreRockState(this.rockClipEndState);
    }
    restoreRockState(st) {
      if (!this.rock || !st) return;
      this.rock.x = st.x;
      this.rock.y = st.y;
      this.rock.dx = st.dx;
      this.rock.dy = st.dy;
      this.rock.rotation = st.rotation;
      this.rock.rotSpeed = st.rotSpeed;
      this.rock.popped = false;
    }
    setAngle(deg) {
      if (!this.ship) return;
      this.ship.angle = Math.round((deg % 360 + 360) % 360);
      this.updateAimUI();
    }
    adjustAngle(deltaDeg) {
      if (!this.ship) return;
      this.setAngle(this.ship.angle + deltaDeg);
    }
    aimAtPoint(px, py) {
      if (!this.ship) return;
      const rad = Math.atan2(py - this.ship.y, px - this.ship.x);
      const deg = rad * 180 / Math.PI + 90;
      this.setAngle(deg);
    }
    /**
     * Test-fire a tracer bullet (uses standard bullet speed from game.js)
     */
    testFire() {
      if (this.state === "FIRING" || !this.ship) return;
      const rad = (this.ship.angle - 90) * Math.PI / 180;
      const noseDist = this.ship.height * 0.55;
      const bx = this.ship.x + Math.cos(rad) * noseDist;
      const by = this.ship.y + Math.sin(rad) * noseDist;
      const scale = this.core.getScreenScale ? this.core.getScreenScale(this.canvas) : 1;
      const BulletClass = this.core.Bullet;
      if (BulletClass) {
        const b = new BulletClass(bx, by, this.ship.angle, 0, 0, scale);
        b.isTracer = true;
        this.testBullets.push(b);
      }
      if (this.soundFx && typeof this.soundFx.playLaser === "function") {
        this.soundFx.playLaser();
      }
    }
    /**
     * Commit the real interception shot using the standard game Bullet!
     */
    fireInterceptShot() {
      if (this.state !== "AIMING" && this.state !== "PREVIEW") return;
      if (!this.ship) return;
      this.restoreRockState(this.rockClipEndState);
      this.state = "FIRING";
      this.isPlayingClip = false;
      const rad = (this.ship.angle - 90) * Math.PI / 180;
      const noseDist = this.ship.height * 0.55;
      const bx = this.ship.x + Math.cos(rad) * noseDist;
      const by = this.ship.y + Math.sin(rad) * noseDist;
      const scale = this.core.getScreenScale ? this.core.getScreenScale(this.canvas) : 1;
      const BulletClass = this.core.Bullet;
      if (BulletClass) {
        this.interceptBullet = new BulletClass(bx, by, this.ship.angle, 0, 0, scale);
      }
      this.closestDistance = Infinity;
      this.minSurfaceDistance = Infinity;
      this.directHit = false;
      if (this.soundFx && typeof this.soundFx.playLaser === "function") {
        this.soundFx.playLaser();
      }
    }
    setupInputHandlers() {
      let isPointerDown = false;
      const handlePointer = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX !== void 0 ? e.clientX : e.touches && e.touches[0] ? e.touches[0].clientX : 0;
        const clientY = e.clientY !== void 0 ? e.clientY : e.touches && e.touches[0] ? e.touches[0].clientY : 0;
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        this.aimAtPoint(px, py);
      };
      this.canvas.addEventListener("mousedown", (e) => {
        isPointerDown = true;
        handlePointer(e);
      });
      window.addEventListener("mousemove", (e) => {
        if (isPointerDown) handlePointer(e);
      });
      window.addEventListener("mouseup", () => {
        isPointerDown = false;
      });
      this.canvas.addEventListener("touchstart", (e) => {
        isPointerDown = true;
        handlePointer(e);
        e.preventDefault();
      }, { passive: false });
      window.addEventListener("touchmove", (e) => {
        if (isPointerDown) handlePointer(e);
      }, { passive: false });
      window.addEventListener("touchend", () => {
        isPointerDown = false;
      });
      window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          this.keys.left = true;
        } else if (e.code === "ArrowRight" || e.code === "KeyD") {
          this.keys.right = true;
        } else if (e.code === "KeyT") {
          this.testFire();
        } else if (e.code === "Space") {
          e.preventDefault();
          if (this.state === "AIMING" || this.state === "PREVIEW") {
            this.fireInterceptShot();
          }
        } else if (e.code === "KeyR") {
          this.playClip();
        }
      });
      window.addEventListener("keyup", (e) => {
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          this.keys.left = false;
        } else if (e.code === "ArrowRight" || e.code === "KeyD") {
          this.keys.right = false;
        }
      });
      const btnLeft = document.getElementById("btnLeft");
      const btnRight = document.getElementById("btnRight");
      const btnFire = document.getElementById("btnFire");
      const replayBtn = document.getElementById("replay-btn");
      const testFireBtn = document.getElementById("test-fire-btn");
      if (btnLeft) {
        const startL = (e) => {
          e.preventDefault();
          this.keys.left = true;
          btnLeft.classList.add("pressed");
        };
        const stopL = (e) => {
          e.preventDefault();
          this.keys.left = false;
          btnLeft.classList.remove("pressed");
        };
        btnLeft.addEventListener("mousedown", startL);
        btnLeft.addEventListener("mouseup", stopL);
        btnLeft.addEventListener("mouseleave", stopL);
        btnLeft.addEventListener("touchstart", startL, { passive: false });
        btnLeft.addEventListener("touchend", stopL, { passive: false });
      }
      if (btnRight) {
        const startR = (e) => {
          e.preventDefault();
          this.keys.right = true;
          btnRight.classList.add("pressed");
        };
        const stopR = (e) => {
          e.preventDefault();
          this.keys.right = false;
          btnRight.classList.remove("pressed");
        };
        btnRight.addEventListener("mousedown", startR);
        btnRight.addEventListener("mouseup", stopR);
        btnRight.addEventListener("mouseleave", stopR);
        btnRight.addEventListener("touchstart", startR, { passive: false });
        btnRight.addEventListener("touchend", stopR, { passive: false });
      }
      if (btnFire) {
        btnFire.addEventListener("click", () => {
          if (this.state === "AIMING" || this.state === "PREVIEW") {
            this.fireInterceptShot();
          }
        });
        btnFire.addEventListener("touchstart", (e) => {
          e.preventDefault();
          btnFire.classList.add("pressed");
          if (this.state === "AIMING" || this.state === "PREVIEW") {
            this.fireInterceptShot();
          }
        }, { passive: false });
        btnFire.addEventListener("touchend", (e) => {
          e.preventDefault();
          btnFire.classList.remove("pressed");
        }, { passive: false });
      }
      if (replayBtn) {
        replayBtn.addEventListener("click", () => this.playClip());
      }
      if (testFireBtn) {
        testFireBtn.addEventListener("click", () => this.testFire());
      }
      document.querySelectorAll(".finetune-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          const step = parseFloat(btn.dataset.step || "0");
          this.adjustAngle(step);
        });
      });
    }
    updateAimUI() {
      if (!this.ship) return;
      const deg = Math.round((this.ship.angle % 360 + 360) % 360);
      const degElem = document.getElementById("telemetry-angle-val");
      if (degElem) degElem.textContent = `${deg}\xB0`;
    }
    loop(timestamp) {
      const dt = Math.min(0.05, (timestamp - this.lastTime) / 1e3);
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      this.animId = requestAnimationFrame(this.loop);
    }
    update(dt) {
      if (this.starfield && typeof this.starfield.update === "function") {
        this.starfield.update(0.25, 0);
      }
      if (this.screenShake > 0) {
        this.screenShake *= 0.9;
        if (this.screenShake < 0.5) this.screenShake = 0;
      }
      if (this.ship && (this.state === "AIMING" || this.state === "PREVIEW")) {
        if (this.keys.left) {
          this.ship.rotateLeft();
          this.updateAimUI();
        }
        if (this.keys.right) {
          this.ship.rotateRight();
          this.updateAimUI();
        }
      }
      if (this.particles && typeof this.particles.update === "function") {
        this.particles.update();
      }
      for (let i = this.testBullets.length - 1; i >= 0; i--) {
        const b = this.testBullets[i];
        if (typeof b.update === "function") {
          b.update(this.width, this.height);
        } else {
          b.x += b.dx;
          b.y += b.dy;
        }
        if (b.hit || b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) {
          this.testBullets.splice(i, 1);
        }
      }
      if (this.state === "PREVIEW" && this.rock) {
        this.clipFrame++;
        this.rock.x += this.rock.dx;
        this.rock.y += this.rock.dy;
        this.rock.rotation += this.rock.rotSpeed;
        if (this.clipFrame >= this.clipDurationFrames) {
          if (this.loopClip) {
            this.playClip();
          } else {
            this.stopClipAtEnd();
          }
        }
        return;
      }
      if (this.state === "FIRING" && this.interceptBullet && this.rock) {
        const b = this.interceptBullet;
        if (typeof b.update === "function") {
          b.update(this.width, this.height);
        } else {
          b.x += b.dx;
          b.y += b.dy;
        }
        this.rock.x += this.rock.dx;
        this.rock.y += this.rock.dy;
        this.rock.rotation += this.rock.rotSpeed;
        let hit = false;
        if (typeof this.rock.containsBullet === "function") {
          hit = this.rock.containsBullet(b);
        } else {
          const d = Math.hypot(b.x - this.rock.x, b.y - this.rock.y);
          hit = d <= this.rock.radius;
        }
        let surfaceDist;
        const pts = typeof this.rock.getTransformedPoints === "function" ? this.rock.getTransformedPoints() : null;
        if (pts && typeof this.rock.distToSegmentSquared === "function") {
          let minEdgeDistSq = Infinity;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const dSq = this.rock.distToSegmentSquared(b.x, b.y, pts[j].x, pts[j].y, pts[i].x, pts[i].y);
            if (dSq < minEdgeDistSq) minEdgeDistSq = dSq;
          }
          surfaceDist = Math.sqrt(minEdgeDistSq);
        } else {
          surfaceDist = Math.max(0, Math.hypot(b.x - this.rock.x, b.y - this.rock.y) - this.rock.radius);
        }
        const centerDist = Math.hypot(b.x - this.rock.x, b.y - this.rock.y);
        if (surfaceDist < this.minSurfaceDistance) {
          this.minSurfaceDistance = surfaceDist;
          this.closestDistance = centerDist;
        }
        if (hit) {
          this.directHit = true;
          this.minSurfaceDistance = 0;
          this.screenShake = 18;
          this.resolveRound(true);
          return;
        }
        const margin = 50;
        if (b.hit || b.x < -margin || b.x > this.width + margin || b.y < -margin || b.y > this.height + margin) {
          this.resolveRound(false);
        }
      }
    }
    resolveRound(isDirectHit) {
      this.state = "RESOLVED";
      const R = this.rock ? this.rock.radius : 25;
      let score = 0;
      if (isDirectHit) {
        score = 100;
        if (this.rock) this.rock.popped = true;
        if (this.soundFx && typeof this.soundFx.playExplosion === "function") {
          this.soundFx.playExplosion(false);
        }
        if (this.particles && typeof this.particles.addExplosion === "function") {
          this.particles.addExplosion(this.interceptBullet.x, this.interceptBullet.y, "#facc15", 35);
        }
        this.resultTelemetry = {
          score: 100,
          isHit: true,
          message: "\u{1F3AF} DIRECT HIT! (100 PTS)",
          subtext: "Perfect ballistic lead solution."
        };
      } else {
        const M = this.minSurfaceDistance / R;
        if (M <= 3) {
          score = Math.max(0, Math.round(100 * Math.pow(1 - M / 3, 1.5)));
        } else {
          score = 0;
        }
        const optimalRad = Math.atan2(this.rock.y - this.ship.y, this.rock.x - this.ship.x);
        const optimalDeg = (optimalRad * 180 / Math.PI + 90 + 360) % 360;
        let angleDiff = Math.abs(this.ship.angle - optimalDeg);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        this.resultTelemetry = {
          score,
          isHit: false,
          message: score > 75 ? "\u26A1 GRAZING NEAR-MISS!" : score > 40 ? "\u26A0\uFE0F CLOSE SHAVE" : "\u274C BALLISTIC DEFLECTION",
          subtext: `Missed by ${M.toFixed(2)}x rock radii (Angle error: ~${angleDiff.toFixed(1)}\xB0)`
        };
      }
      this.roundScore = score;
      if (this.onRoundComplete) {
        this.onRoundComplete(this.roundScore, this.resultTelemetry);
      }
    }
    render() {
      const ctx = this.ctx;
      const W = this.width;
      const H = this.height;
      ctx.save();
      if (this.screenShake > 0) {
        const sx = (Math.random() - 0.5) * this.screenShake;
        const sy = (Math.random() - 0.5) * this.screenShake;
        ctx.translate(sx, sy);
      }
      if (this.starfield && typeof this.starfield.draw === "function") {
        this.starfield.draw(ctx);
      } else {
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, W, H);
      }
      if (this.rock && !this.rock.popped) {
        if (typeof this.rock.draw === "function") {
          this.rock.draw(ctx);
        }
      }
      if (this.particles && typeof this.particles.draw === "function") {
        this.particles.draw(ctx);
      }
      for (const b of this.testBullets) {
        if (typeof b.draw === "function") {
          b.draw(ctx);
        }
      }
      if (this.interceptBullet && !this.interceptBullet.hit) {
        if (typeof this.interceptBullet.draw === "function") {
          this.interceptBullet.draw(ctx);
        }
      }
      if (this.ship && typeof this.ship.draw === "function") {
        this.ship.draw(ctx);
      }
      if (this.state === "PREVIEW") {
        this.renderClipOverlay(ctx, W, H);
      }
      ctx.restore();
    }
    renderClipOverlay(ctx, W, H) {
      ctx.save();
      const progress = Math.min(1, this.clipFrame / this.clipDurationFrames);
      const barW = Math.min(480, W * 0.6);
      const barH = 5;
      const barX = (W - barW) / 2;
      const barY = 78;
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.fillRect(barX, barY, barW * progress, barH);
      ctx.fillStyle = "#94a3b8";
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(`RECON PREVIEW: ${(progress * 1).toFixed(2)}s / 1.00s`, W / 2, barY + 18);
      ctx.restore();
    }
  };

  // asteroidle/js/daily.js
  var DailyManager = class {
    constructor() {
      this.isUnlimited = false;
      this.currentDateStr = getTodayDateStr();
      this.puzzleNum = getPuzzleNumber(this.currentDateStr);
      this.challenges = [];
      this.currentRound = 1;
      this.roundScores = [];
      this.engine = null;
      this.initDOM();
      this.checkURLParams();
      this.setupModals();
      this.setupSettings();
      this.startPuzzle(this.currentDateStr);
    }
    checkURLParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get("date");
      const modeParam = urlParams.get("mode");
      if (modeParam === "unlimited") {
        this.isUnlimited = true;
        this.updateModeButton();
        this.startUnlimitedPuzzle();
        return;
      }
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        this.currentDateStr = dateParam;
        this.puzzleNum = getPuzzleNumber(dateParam);
      }
    }
    initDOM() {
      const canvas = document.getElementById("gameCanvas") || document.getElementById("asteroidle-canvas");
      this.engine = new AsteroidleEngine(canvas, (score, telem) => {
        this.onRoundResolved(score, telem);
      });
      const modeBtn = document.getElementById("mode-toggle-btn");
      if (modeBtn) {
        modeBtn.addEventListener("click", () => {
          this.isUnlimited = !this.isUnlimited;
          this.updateModeButton();
          if (this.isUnlimited) {
            this.startUnlimitedPuzzle();
          } else {
            this.startPuzzle(getTodayDateStr());
          }
        });
      }
      const soundBtn = document.getElementById("soundToggleBtn");
      if (soundBtn) {
        const isSoundOn = localStorage.getItem("spaceship_flight_sound") === "true";
        soundBtn.textContent = isSoundOn ? "\u{1F50A}" : "\u{1F507}";
        soundBtn.addEventListener("click", () => {
          const nextState = !(localStorage.getItem("spaceship_flight_sound") === "true");
          this.engine.setSound(nextState);
          soundBtn.textContent = nextState ? "\u{1F50A}" : "\u{1F507}";
          const settingSound = document.getElementById("settingSound");
          if (settingSound) settingSound.checked = nextState;
        });
      }
      const nextBtn = document.getElementById("next-round-btn");
      if (nextBtn) {
        nextBtn.addEventListener("click", () => this.advanceNextRound());
      }
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
          const banner = document.getElementById("round-result-banner");
          if (banner && banner.classList.contains("visible")) {
            e.preventDefault();
            this.advanceNextRound();
          }
        }
      });
      this.updateModeButton();
    }
    updateModeButton() {
      const modeBtn = document.getElementById("mode-toggle-btn");
      if (!modeBtn) return;
      if (this.isUnlimited) {
        modeBtn.textContent = "DAILY";
        modeBtn.classList.add("unlimited-active");
        modeBtn.title = "Switch to Daily Puzzle Mode";
      } else {
        modeBtn.textContent = "UNLIMITED";
        modeBtn.classList.remove("unlimited-active");
        modeBtn.title = "Switch to Unlimited Practice Mode";
      }
    }
    startPuzzle(dateStr) {
      this.currentDateStr = dateStr;
      this.puzzleNum = getPuzzleNumber(dateStr);
      this.challenges = generateDailyChallenges(dateStr);
      this.roundScores = [];
      this.currentRound = 1;
      const existing = getRecordForDate(dateStr);
      if (existing && existing.completed) {
        this.roundScores = existing.roundScores || [0, 0, 0, 0, 0];
        this.updateHeaderBanner();
        this.updatePips();
        this.showResultsModal(existing.totalScore);
        return;
      }
      const saved = loadActiveState(dateStr);
      if (saved && saved.round > 1 && Array.isArray(saved.scores)) {
        this.currentRound = Math.min(5, saved.round);
        this.roundScores = saved.scores;
      }
      this.updateHeaderBanner();
      this.updatePips();
      this.loadCurrentRound();
    }
    startUnlimitedPuzzle() {
      const randomSeed = `unlimited-${Date.now()}-${Math.random()}`;
      this.currentDateStr = "UNLIMITED";
      this.puzzleNum = Math.floor(Math.random() * 9e3) + 1e3;
      const rng = createMulberry32(hashString(randomSeed));
      const shapes = [0, 1, 2, 3, 4];
      for (let i = shapes.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
      }
      this.challenges = [];
      for (let r = 1; r <= 5; r++) {
        this.challenges.push({
          round: r,
          shapeIndex: shapes[r - 1],
          baseRadius: 18 + rng() * 18,
          speed: 0.9 + rng() * 0.5,
          rotSpeed: (rng() - 0.5) * 0.06,
          bulletTier: 3,
          side: Math.floor(rng() * 4),
          sidePos: 0.2 + rng() * 0.6,
          targetX: 0.3 + rng() * 0.4,
          targetY: 0.3 + rng() * 0.4,
          shipX: 0.25 + rng() * 0.5,
          shipY: 0.25 + rng() * 0.5,
          initialHeading: Math.floor(rng() * 360)
        });
      }
      this.roundScores = [];
      this.currentRound = 1;
      this.updateHeaderBanner();
      this.updatePips();
      this.loadCurrentRound();
    }
    updateHeaderBanner() {
      const pNumBadge = document.getElementById("puzzle-number-badge");
      const pDateLabel = document.getElementById("puzzle-date-label");
      if (pNumBadge) {
        pNumBadge.textContent = this.isUnlimited ? `SECTOR #${this.puzzleNum}` : `ASTEROIDLE #${this.puzzleNum}`;
      }
      if (pDateLabel) {
        pDateLabel.textContent = this.isUnlimited ? `UNLIMITED MISSION` : this.currentDateStr;
      }
      const roundInd = document.getElementById("round-indicator");
      if (roundInd) {
        roundInd.textContent = `${Math.min(5, this.currentRound)} / 5`;
      }
      const totalScoreVal = document.getElementById("total-score-val");
      if (totalScoreVal) {
        const sum = this.roundScores.reduce((a, b) => a + b, 0);
        totalScoreVal.textContent = `${sum} / 500`;
      }
    }
    updatePips() {
      for (let r = 1; r <= 5; r++) {
        const pip = document.getElementById(`pip-${r}`);
        if (!pip) continue;
        pip.className = "round-pip";
        const score = this.roundScores[r - 1];
        if (score !== void 0) {
          pip.textContent = score;
          if (score === 100) pip.classList.add("hit");
          else if (score > 0) pip.classList.add("near");
          else pip.classList.add("miss");
        } else if (r === this.currentRound) {
          pip.textContent = r;
          pip.classList.add("current");
        } else {
          pip.textContent = r;
        }
      }
    }
    loadCurrentRound() {
      if (this.currentRound > 5) {
        this.finalizePuzzle();
        return;
      }
      const ch = this.challenges[this.currentRound - 1];
      if (!ch) return;
      const resultBanner = document.getElementById("round-result-banner");
      if (resultBanner) resultBanner.classList.remove("visible");
      this.updateHeaderBanner();
      this.updatePips();
      this.engine.loadChallenge(ch);
    }
    onRoundResolved(score, telem) {
      this.roundScores[this.currentRound - 1] = score;
      if (!this.isUnlimited) {
        saveActiveState(this.currentDateStr, this.currentRound, this.roundScores);
      }
      this.updateHeaderBanner();
      this.updatePips();
      const resultBanner = document.getElementById("round-result-banner");
      const headline = document.getElementById("round-score-headline");
      const points = document.getElementById("round-score-points");
      const subtext = document.getElementById("round-score-subtext");
      const nextBtn = document.getElementById("next-round-btn");
      if (headline) headline.textContent = telem.message;
      if (points) points.textContent = `+${score} PTS`;
      if (subtext) subtext.textContent = telem.subtext;
      if (nextBtn) {
        nextBtn.textContent = this.currentRound < 5 ? "NEXT ASTEROID [SPACE] \u2794" : "VIEW MISSION INTEL [SPACE] \u{1F4CA}";
      }
      if (resultBanner) resultBanner.classList.add("visible");
    }
    advanceNextRound() {
      const resultBanner = document.getElementById("round-result-banner");
      if (resultBanner) resultBanner.classList.remove("visible");
      this.currentRound++;
      if (this.currentRound <= 5) {
        this.loadCurrentRound();
      } else {
        this.finalizePuzzle();
      }
    }
    finalizePuzzle() {
      const total = this.roundScores.reduce((a, b) => a + b, 0);
      if (!this.isUnlimited) {
        recordDailyCompletion(this.currentDateStr, this.puzzleNum, this.roundScores, total);
      }
      this.showResultsModal(total);
    }
    showResultsModal(totalScore) {
      this.renderStatsModal();
      const modal = document.getElementById("stats-modal");
      if (modal) modal.classList.add("active");
    }
    setupModals() {
      document.querySelectorAll(".modal-close-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const targetId = btn.dataset.close;
          if (targetId) {
            document.getElementById(targetId)?.classList.remove("active");
          } else {
            btn.closest(".modal-backdrop, .overlay")?.classList.remove("active");
          }
        });
      });
      document.querySelectorAll(".modal-backdrop").forEach((modal) => {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) modal.classList.remove("active");
        });
      });
      document.getElementById("help-modal-btn")?.addEventListener("click", () => {
        document.getElementById("help-modal")?.classList.add("active");
      });
      document.getElementById("stats-modal-btn")?.addEventListener("click", () => {
        this.renderStatsModal();
        document.getElementById("stats-modal")?.classList.add("active");
      });
      document.getElementById("archive-modal-btn")?.addEventListener("click", () => {
        this.renderArchiveModal();
        document.getElementById("archive-modal")?.classList.add("active");
      });
      document.getElementById("share-score-btn")?.addEventListener("click", () => {
        this.shareScore();
      });
    }
    setupSettings() {
      const settingsModal = document.getElementById("settingsModal");
      const settingsBtn = document.getElementById("settingsBtn");
      const closeBtn = document.getElementById("closeSettingsBtn");
      if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener("click", () => settingsModal.classList.add("active"));
      }
      if (closeBtn && settingsModal) {
        closeBtn.addEventListener("click", () => settingsModal.classList.remove("active"));
      }
      const redBtn = document.getElementById("selectRedShip");
      const blueBtn = document.getElementById("selectBlueShip");
      const currentSkin = localStorage.getItem("spaceship_flight_ship_skin") || "red";
      if (currentSkin === "blue") {
        blueBtn?.classList.add("active");
        redBtn?.classList.remove("active");
      } else {
        redBtn?.classList.add("active");
        blueBtn?.classList.remove("active");
      }
      const updateSkin = (skin) => {
        this.engine.setShipSkin(skin);
        if (skin === "blue") {
          blueBtn?.classList.add("active");
          redBtn?.classList.remove("active");
        } else {
          redBtn?.classList.add("active");
          blueBtn?.classList.remove("active");
        }
      };
      redBtn?.addEventListener("click", () => updateSkin("red"));
      blueBtn?.addEventListener("click", () => updateSkin("blue"));
      const shipScaleSlider = document.getElementById("settingShipSize");
      const shipScaleVal = document.getElementById("shipSizeVal");
      const currentScale = parseInt(localStorage.getItem("spaceship_flight_ship_scale") || "100", 10);
      if (shipScaleSlider) {
        shipScaleSlider.value = currentScale;
        if (shipScaleVal) shipScaleVal.textContent = `${currentScale}%`;
        shipScaleSlider.addEventListener("input", (e) => {
          const val = parseInt(e.target.value, 10);
          if (shipScaleVal) shipScaleVal.textContent = `${val}%`;
          this.engine.setShipScale(val);
        });
      }
      const soundCheckbox = document.getElementById("settingSound");
      const soundBtn = document.getElementById("soundToggleBtn");
      const isSoundOn = localStorage.getItem("spaceship_flight_sound") === "true";
      if (soundCheckbox) {
        soundCheckbox.checked = isSoundOn;
        soundCheckbox.addEventListener("change", (e) => {
          this.engine.setSound(e.target.checked);
          if (soundBtn) soundBtn.textContent = e.target.checked ? "\u{1F50A}" : "\u{1F507}";
        });
      }
      const touchSelect = document.getElementById("settingTouchControls");
      const touchControls = document.getElementById("touchControls");
      const savedTouch = localStorage.getItem("spaceship_flight_touch_visibility") || "auto";
      if (touchSelect) {
        touchSelect.value = savedTouch;
        if (touchControls) {
          touchControls.classList.toggle("hidden", savedTouch === "hidden");
        }
        touchSelect.addEventListener("change", (e) => {
          const val = e.target.value;
          try {
            localStorage.setItem("spaceship_flight_touch_visibility", val);
          } catch (err) {
          }
          if (touchControls) {
            touchControls.classList.toggle("hidden", val === "hidden");
          }
        });
      }
      const btnSizeSlider = document.getElementById("settingBtnSize");
      const btnSizeVal = document.getElementById("btnSizeVal");
      const savedBtnSize = localStorage.getItem("spaceship_flight_btn_size") || "72";
      document.documentElement.style.setProperty("--ctrl-btn-size", `${savedBtnSize}px`);
      if (btnSizeSlider) {
        btnSizeSlider.value = savedBtnSize;
        if (btnSizeVal) btnSizeVal.textContent = `${savedBtnSize}px`;
        btnSizeSlider.addEventListener("input", (e) => {
          const sz = e.target.value;
          if (btnSizeVal) btnSizeVal.textContent = `${sz}px`;
          document.documentElement.style.setProperty("--ctrl-btn-size", `${sz}px`);
          try {
            localStorage.setItem("spaceship_flight_btn_size", sz);
          } catch (err) {
          }
        });
      }
    }
    renderStatsModal() {
      const stats = getStats();
      const playedElem = document.getElementById("stat-played");
      const winPctElem = document.getElementById("stat-win-pct");
      const streakElem = document.getElementById("stat-streak");
      const maxStreakElem = document.getElementById("stat-max-streak");
      if (playedElem) playedElem.textContent = stats.played;
      if (winPctElem) winPctElem.textContent = stats.played > 0 ? `${Math.round(stats.won / stats.played * 100)}%` : "0%";
      if (streakElem) streakElem.textContent = stats.currentStreak;
      if (maxStreakElem) maxStreakElem.textContent = stats.maxStreak;
      const distContainer = document.getElementById("score-distribution-bars");
      if (distContainer) {
        const keys = ["0-100", "101-200", "201-300", "301-400", "401-500"];
        const maxVal = Math.max(1, ...keys.map((k) => stats.distribution[k] || 0));
        distContainer.innerHTML = keys.map((k) => {
          const count = stats.distribution[k] || 0;
          const pct = Math.max(8, Math.round(count / maxVal * 100));
          return `
                    <div class="dist-row">
                        <span class="dist-label">${k}</span>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill" style="width: ${pct}%">${count}</div>
                        </div>
                    </div>
                `;
        }).join("");
      }
      const blocksContainer = document.getElementById("mission-round-blocks");
      const finalScoreElem = document.getElementById("mission-final-score-val");
      const total = this.roundScores.reduce((a, b) => a + b, 0);
      if (finalScoreElem) finalScoreElem.textContent = `${total} / 500`;
      if (blocksContainer) {
        blocksContainer.innerHTML = [1, 2, 3, 4, 5].map((r) => {
          const s = this.roundScores[r - 1];
          let cls = "block-pending";
          let text = "--";
          if (s !== void 0) {
            text = s;
            if (s === 100) cls = "block-hit";
            else if (s >= 75) cls = "block-high";
            else if (s >= 35) cls = "block-mid";
            else cls = "block-miss";
          }
          return `<div class="round-block ${cls}"><span class="block-label">R${r}</span><span class="block-val">${text}</span></div>`;
        }).join("");
      }
    }
    shareScore() {
      const total = this.roundScores.reduce((a, b) => a + b, 0);
      const emojis = this.roundScores.map((s) => {
        if (s === 100) return "\u{1F7E2} 100";
        if (s >= 75) return `\u{1F7E1}  ${s}`;
        if (s >= 35) return `\u{1F7E0}  ${s}`;
        return `\u{1F534}  ${s}`;
      });
      const shareText = `Asteroidle #${this.puzzleNum} \u{1F3AF} ${total}/500
` + emojis.map((e, idx) => `\u{1FAA8} R${idx + 1}: ${e}`).join("\n") + `
https://amitjoshi2724.github.io/Spaceship-Flight/asteroidle/`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          this.showToast();
        }).catch(() => {
          alert(shareText);
        });
      } else {
        alert(shareText);
      }
    }
    showToast() {
      const toast = document.getElementById("share-toast");
      if (!toast) return;
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 2500);
    }
    renderArchiveModal() {
      const history = getHistory();
      const listElem = document.getElementById("archive-list-container");
      if (!listElem) return;
      const today = /* @__PURE__ */ new Date();
      const items = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const pNum = getPuzzleNumber(dateStr);
        const record = history[dateStr];
        items.push({
          dateStr,
          pNum,
          isToday: i === 0,
          completed: record && record.completed,
          score: record ? record.totalScore : null
        });
      }
      listElem.innerHTML = items.map((item) => {
        let statusClass = "status-pending";
        let scoreText = "Unplayed";
        if (item.completed) {
          statusClass = "status-completed";
          scoreText = `Score: ${item.score}/500`;
        } else if (item.isToday) {
          statusClass = "status-today";
          scoreText = "Today's Mission";
        }
        return `
                <div class="archive-card ${statusClass}" data-date="${item.dateStr}">
                    <div class="archive-info">
                        <span class="archive-number">#${item.pNum}</span>
                        <span class="archive-date">${item.dateStr}</span>
                    </div>
                    <div class="archive-action">
                        <span class="archive-badge">${scoreText}</span>
                        <button class="archive-play-btn menu-btn" data-date="${item.dateStr}">Play</button>
                    </div>
                </div>
            `;
      }).join("");
      listElem.querySelectorAll(".archive-play-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const date = e.target.dataset.date;
          document.getElementById("archive-modal")?.classList.remove("active");
          this.isUnlimited = false;
          this.updateModeButton();
          this.startPuzzle(date);
        });
      });
    }
  };
  function bootAsteroidle() {
    if (!window.asteroidleApp && (document.getElementById("gameCanvas") || document.getElementById("asteroidle-canvas"))) {
      window.asteroidleApp = new DailyManager();
    }
  }
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootAsteroidle);
  } else {
    bootAsteroidle();
  }
})();
