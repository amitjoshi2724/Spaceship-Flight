/**
 * Spaceship Flight - WebRTC Peer-to-Peer Online Multiplayer Module
 * Enables 2-player real-time online co-op via direct PeerJS WebRTC DataChannels.
 */

(function () {
  'use strict';

  // Space-themed prefixes for friendly room codes (e.g., NOVA-42, ORION-88)
  const SPACE_WORDS = [
    'NOVA', 'STAR', 'AERO', 'LUNA', 'ORBIT', 'PULSAR', 'WARP',
    'APOLLO', 'TITAN', 'ORION', 'COMET', 'SOLAR', 'GALAXY', 'VOYAGER',
    'NEBULA', 'COSMOS', 'ASTRO', 'AURORA', 'METEOR', 'PHOENIX'
  ];

  function generateRoomCode() {
    const word = SPACE_WORDS[Math.floor(Math.random() * SPACE_WORDS.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${word}-${num}`;
  }

  function getPeerIdForRoom(roomCode) {
    return 'spaceship-flight-' + roomCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  class SpaceshipNetwork {
    constructor() {
      this.peer = null;
      this.conn = null;
      this.isHost = false;
      this.roomCode = null;
      this.isConnected = false;
      this.ping = 0;
      this._pingTimer = null;
      this._lastPingTimestamp = 0;

      // Host settings
      this.hostRole = 'red'; // 'red' or 'blue'
      this.guestRole = 'blue';

      // Callbacks
      this.onStatusChange = null; // (statusText, isError)
      this.onPeerReady = null;    // (roomCode)
      this.onConnected = null;    // ({ isHost, hostRole, guestRole })
      this.onDisconnected = null; // ()
      this.onLobbyUpdate = null;  // ({ hostRole, guestRole, powerMode, difficulty })
      this.onGameStart = null;    // (config)
      this.onGameRestart = null;  // ()
      this.onSnapshot = null;     // (snapshot)
      this.onInput = null;        // (input)
    }

    isPeerAvailable() {
      return typeof window !== 'undefined' && typeof window.Peer === 'function';
    }

    /**
     * Creates a new multiplayer room as Host
     */
    createRoom(preferredHostRole = 'red') {
      return new Promise((resolve, reject) => {
        if (!this.isPeerAvailable()) {
          const msg = 'WebRTC library loading or unavailable. Check internet connection.';
          if (this.onStatusChange) this.onStatusChange(msg, true);
          return reject(new Error(msg));
        }

        this.disconnect();
        this.isHost = true;
        this.hostRole = preferredHostRole;
        this.guestRole = preferredHostRole === 'red' ? 'blue' : 'red';
        this.roomCode = generateRoomCode();
        const peerId = getPeerIdForRoom(this.roomCode);

        if (this.onStatusChange) this.onStatusChange('Connecting to peer network...');

        try {
          this.peer = new window.Peer(peerId, {
            debug: 1,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
              ]
            }
          });
        } catch (err) {
          console.error('[Network] Peer init error:', err);
          if (this.onStatusChange) this.onStatusChange('Could not initialize peer network: ' + err.message, true);
          return reject(err);
        }

        this.peer.on('open', (id) => {
          console.log('[Network] Host Peer opened with ID:', id);
          if (this.onStatusChange) this.onStatusChange('Room created! Waiting for co-pilot to join...');
          if (this.onPeerReady) this.onPeerReady(this.roomCode);
          resolve(this.roomCode);
        });

        this.peer.on('connection', (connection) => {
          if (this.conn && this.conn.open) {
            // Reject extra connections if room is full
            connection.close();
            return;
          }

          this.conn = connection;
          this._setupConnection();
        });

        this.peer.on('error', (err) => {
          console.error('[Network] Peer error:', err);
          if (err.type === 'unavailable-id') {
            // Code conflict: retry with new code
            setTimeout(() => {
              this.createRoom(this.hostRole).then(resolve).catch(reject);
            }, 200);
            return;
          }
          if (this.onStatusChange) this.onStatusChange('Network error: ' + (err.message || err.type), true);
          reject(err);
        });
      });
    }

    /**
     * Joins an existing room as Guest
     */
    joinRoom(roomCode) {
      return new Promise((resolve, reject) => {
        if (!this.isPeerAvailable()) {
          const msg = 'WebRTC library loading or unavailable. Check internet connection.';
          if (this.onStatusChange) this.onStatusChange(msg, true);
          return reject(new Error(msg));
        }

        const cleanCode = (roomCode || '').trim().toUpperCase();
        if (!cleanCode) {
          const msg = 'Please enter a valid room code.';
          if (this.onStatusChange) this.onStatusChange(msg, true);
          return reject(new Error(msg));
        }

        this.disconnect();
        this.isHost = false;
        this.roomCode = cleanCode;
        const hostPeerId = getPeerIdForRoom(this.roomCode);

        if (this.onStatusChange) this.onStatusChange(`Locating room ${this.roomCode}...`);

        try {
          // Ephemeral peer for guest
          this.peer = new window.Peer(null, {
            debug: 1,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
              ]
            }
          });
        } catch (err) {
          console.error('[Network] Peer init error:', err);
          if (this.onStatusChange) this.onStatusChange('Could not connect to peer network: ' + err.message, true);
          return reject(err);
        }

        let resolved = false;

        this.peer.on('open', () => {
          console.log('[Network] Guest Peer open, connecting to Host:', hostPeerId);
          if (this.onStatusChange) this.onStatusChange(`Connecting to Host [${this.roomCode}]...`);
          this.conn = this.peer.connect(hostPeerId, {
            reliable: true
          });

          this.conn.on('open', () => {
            if (!resolved) {
              resolved = true;
              resolve(this.roomCode);
            }
          });

          this._setupConnection();
        });

        this.peer.on('error', (err) => {
          console.error('[Network] Guest peer error:', err);
          if (err.type === 'peer-unavailable') {
            if (this.onStatusChange) this.onStatusChange(`Room ${this.roomCode} not found. Check the code and try again.`, true);
          } else {
            if (this.onStatusChange) this.onStatusChange('Network error: ' + (err.message || err.type), true);
          }
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        });
      });
    }

    /**
     * Host changes ship roles before game launch
     */
    setHostRole(newHostRole) {
      if (!this.isHost) return;
      this.hostRole = newHostRole;
      this.guestRole = (newHostRole === 'red') ? 'blue' : 'red';

      if (this.conn && this.conn.open) {
        this.send({
          type: 'LOBBY_STATE',
          hostRole: this.hostRole,
          guestRole: this.guestRole,
          roomCode: this.roomCode
        });
      }

      if (this.onLobbyUpdate) {
        this.onLobbyUpdate({
          hostRole: this.hostRole,
          guestRole: this.guestRole
        });
      }
    }

    _setupConnection() {
      if (!this.conn) return;

      this.conn.on('open', () => {
        console.log('[Network] WebRTC DataChannel connection established!');
        this.isConnected = true;

        if (this.isHost) {
          // Immediately inform guest of assigned roles and current lobby state
          this.send({
            type: 'LOBBY_STATE',
            hostRole: this.hostRole,
            guestRole: this.guestRole,
            roomCode: this.roomCode
          });

          if (this.onStatusChange) this.onStatusChange('Co-pilot connected! Ready to launch mission.');
          if (this.onConnected) this.onConnected({ isHost: true, hostRole: this.hostRole, guestRole: this.guestRole });
        } else {
          if (this.onStatusChange) this.onStatusChange('Connected to Host! Synchronizing mission...');
        }

        this._startPingInterval();
      });

      this.conn.on('data', (data) => {
        this._handleData(data);
      });

      this.conn.on('close', () => {
        console.log('[Network] Peer connection closed');
        this._handleDisconnect('Peer disconnected');
      });

      this.conn.on('error', (err) => {
        console.error('[Network] Connection error:', err);
        this._handleDisconnect('Connection error: ' + (err.message || 'Peer lost'));
      });
    }

    _handleData(data) {
      if (!data || !data.type) return;

      switch (data.type) {
        case 'PING':
          // Respond to ping immediately
          this.send({ type: 'PONG', t: data.t });
          break;

        case 'PONG':
          if (data.t) {
            this.ping = Math.max(1, Math.round(performance.now() - data.t));
          }
          break;

        case 'LOBBY_STATE':
          this.hostRole = data.hostRole;
          this.guestRole = data.guestRole;
          if (this.onLobbyUpdate) {
            this.onLobbyUpdate({
              hostRole: data.hostRole,
              guestRole: data.guestRole,
              roomCode: data.roomCode
            });
          }
          if (!this.isHost) {
            const roleName = this.guestRole === 'red' ? '🔴 RED SHIP' : '🔵 BLUE SHIP';
            if (this.onStatusChange) this.onStatusChange(`Connected! Assigned: ${roleName}. Waiting for Host to launch...`);
            if (this.onConnected) this.onConnected({ isHost: false, hostRole: this.hostRole, guestRole: this.guestRole });
          }
          break;

        case 'START_GAME':
          if (this.onGameStart) this.onGameStart(data);
          break;

        case 'RESTART_GAME':
          if (this.onGameRestart) this.onGameRestart();
          break;

        case 'INPUT':
          if (this.isHost && this.onInput) {
            this.onInput(data);
          }
          break;

        case 'SNAPSHOT':
          if (!this.isHost && this.onSnapshot) {
            this.onSnapshot(data);
          }
          break;

        default:
          break;
      }
    }

    _startPingInterval() {
      if (this._pingTimer) clearInterval(this._pingTimer);
      this._pingTimer = setInterval(() => {
        if (this.conn && this.conn.open) {
          this.send({ type: 'PING', t: performance.now() });
        }
      }, 1500);
    }

    _stopPingInterval() {
      if (this._pingTimer) {
        clearInterval(this._pingTimer);
        this._pingTimer = null;
      }
    }

    _handleDisconnect(reason) {
      this.isConnected = false;
      this._stopPingInterval();
      if (this.onStatusChange) this.onStatusChange(reason, true);
      if (this.onDisconnected) this.onDisconnected();
    }

    send(data) {
      if (this.conn && this.conn.open) {
        try {
          this.conn.send(data);
        } catch (e) {
          console.warn('[Network] Send failed:', e);
        }
      }
    }

    /**
     * Host broadcasts game launch packet
     */
    launchGame(config = {}) {
      if (!this.isHost || !this.conn || !this.conn.open) return false;
      const payload = {
        type: 'START_GAME',
        hostRole: this.hostRole,
        guestRole: this.guestRole,
        powerMode: config.powerMode || 'dual',
        difficulty: config.difficulty || 'medium',
        timestamp: Date.now()
      };
      this.send(payload);
      if (this.onGameStart) this.onGameStart(payload);
      return true;
    }

    /**
     * Host broadcasts replay/restart after game over
     */
    restartGame() {
      if (!this.isHost || !this.conn || !this.conn.open) return false;
      this.send({ type: 'RESTART_GAME' });
      if (this.onGameRestart) this.onGameRestart();
      return true;
    }

    disconnect() {
      this._stopPingInterval();
      this.isConnected = false;
      if (this.conn) {
        try { this.conn.close(); } catch (e) { }
        this.conn = null;
      }
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) { }
        this.peer = null;
      }
      this.roomCode = null;
    }
  }

  // Export globally
  window.SpaceshipNetwork = SpaceshipNetwork;
})();
