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

      // Pilot Names
      this.pilotName = '';
      this.peerPilotName = '';

      // Host settings
      this.hostRole = 'red'; // 'red' or 'blue'
      this.guestRole = 'blue';

      // Callbacks
      this.onStatusChange = null; // (statusText, isError)
      this.onPeerReady = null;    // (roomCode)
      this.onConnected = null;    // ({ isHost, hostRole, guestRole, hostName, guestName })
      this.onDisconnected = null; // ()
      this.onLobbyUpdate = null;  // ({ hostRole, guestRole, hostName, guestName, roomCode })
      this.onPilotUpdate = null;  // ({ hostName, guestName })
      this.onGameStart = null;    // (config)
      this.onGameRestart = null;  // ()
      this.onSnapshot = null;     // (snapshot)
      this.onInput = null;        // (input)
      this.onPause = null;        // ({ pausedBy, isHost, role })
      this.onResume = null;       // ({ resumedBy, isHost })
      this.onGameOver = null;     // ({ score, highScore, p1Kills, p2Kills })
      this.onRequestRestart = null; // ({ name })
    }

    isPeerAvailable() {
      return typeof window !== 'undefined' && typeof window.Peer === 'function';
    }

    /**
     * Creates a new multiplayer room as Host
     */
    createRoom(preferredHostRole = 'red', pilotName = '') {
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
        this.pilotName = (pilotName || '').trim().slice(0, 30);
        this.peerPilotName = '';
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
    joinRoom(roomCode, pilotName = '') {
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
        this.pilotName = (pilotName || '').trim().slice(0, 30);
        this.peerPilotName = '';
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

      const payload = {
        type: 'LOBBY_STATE',
        hostRole: this.hostRole,
        guestRole: this.guestRole,
        hostName: this.pilotName,
        guestName: this.peerPilotName,
        roomCode: this.roomCode
      };

      if (this.conn && this.conn.open) {
        this.send(payload);
      }

      if (this.onLobbyState) {
        this.onLobbyState(payload);
      }
      if (this.onLobbyUpdate) {
        this.onLobbyUpdate(payload);
      }
    }

    /**
     * Updates local player callsign and notifies remote peer
     */
    updatePilotName(newName) {
      this.pilotName = (newName || '').trim().slice(0, 30);
      if (this.conn && this.conn.open) {
        this.send({
          type: 'PILOT_RENAME',
          pilotName: this.pilotName
        });
        if (this.isHost) {
          this.send({
            type: 'LOBBY_STATE',
            hostRole: this.hostRole,
            guestRole: this.guestRole,
            hostName: this.pilotName,
            guestName: this.peerPilotName,
            roomCode: this.roomCode
          });
        }
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
            hostName: this.pilotName,
            guestName: this.peerPilotName,
            roomCode: this.roomCode
          });

          if (this.onStatusChange) this.onStatusChange('Co-pilot connected! Synchronizing callsigns...');
          if (this.onConnected) this.onConnected({ isHost: true, hostRole: this.hostRole, guestRole: this.guestRole, hostName: this.pilotName, guestName: this.peerPilotName });
        } else {
          if (this.onStatusChange) this.onStatusChange('Connected to Host! Announcing callsign...');
          // Announce guest pilot name to host
          this.send({
            type: 'PILOT_HELLO',
            pilotName: this.pilotName
          });
          if (this.onConnected) this.onConnected({ isHost: false, hostRole: this.hostRole, guestRole: this.guestRole, hostName: this.peerPilotName, guestName: this.pilotName });
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
            if (this.onPingUpdate) this.onPingUpdate(this.ping);
          }
          break;

        case 'PILOT_HELLO':
          if (this.isHost) {
            this.peerPilotName = (data.pilotName || '').trim().slice(0, 30);
            console.log('[Network] Co-pilot announced name:', this.peerPilotName);
            const state = {
              type: 'LOBBY_STATE',
              hostRole: this.hostRole,
              guestRole: this.guestRole,
              hostName: this.pilotName,
              guestName: this.peerPilotName,
              roomCode: this.roomCode
            };
            this.send(state);
            if (this.onPilotUpdate) {
              this.onPilotUpdate({
                hostName: this.pilotName,
                guestName: this.peerPilotName
              });
            }
            if (this.onLobbyState) this.onLobbyState(state);
            if (this.onLobbyUpdate) this.onLobbyUpdate(state);
          }
          break;

        case 'PILOT_RENAME':
          this.peerPilotName = (data.pilotName || '').trim().slice(0, 30);
          if (this.isHost) {
            this.send({
              type: 'LOBBY_STATE',
              hostRole: this.hostRole,
              guestRole: this.guestRole,
              hostName: this.pilotName,
              guestName: this.peerPilotName,
              roomCode: this.roomCode
            });
          }
          if (this.onPilotUpdate) {
            this.onPilotUpdate({
              hostName: this.isHost ? this.pilotName : this.peerPilotName,
              guestName: this.isHost ? this.peerPilotName : this.pilotName
            });
          }
          break;

        case 'LOBBY_STATE':
          this.hostRole = data.hostRole;
          this.guestRole = data.guestRole;
          if (data.hostName && !this.isHost) {
            this.peerPilotName = String(data.hostName).trim().slice(0, 30);
          }
          if (data.guestName && this.isHost) {
            this.peerPilotName = String(data.guestName).trim().slice(0, 30);
          }
          if (this.onPilotUpdate) {
            this.onPilotUpdate({
              hostName: data.hostName || (this.isHost ? this.pilotName : this.peerPilotName),
              guestName: data.guestName || (this.isHost ? this.peerPilotName : this.pilotName)
            });
          }
          if (this.onLobbyState) {
            this.onLobbyState(data);
          }
          if (this.onLobbyUpdate) {
            this.onLobbyUpdate(data);
          }
          if (!this.isHost) {
            const hostDisplay = data.hostName ? `Host [${data.hostName}]` : 'Host';
            const roleName = this.guestRole === 'red' ? '🔴 RED SHIP' : '🔵 BLUE SHIP';
            if (this.onStatusChange) this.onStatusChange(`Connected to ${hostDisplay}! Assigned: ${roleName}. Waiting for Host to launch...`);
            if (this.onConnected) this.onConnected({ isHost: false, hostRole: this.hostRole, guestRole: this.guestRole, hostName: data.hostName, guestName: this.pilotName });
          }
          break;

        case 'START_GAME':
          if (this.onStartGame) this.onStartGame(data);
          else if (this.onGameStart) this.onGameStart(data);
          break;

        case 'RESTART_GAME':
          if (this.onRestartGame) this.onRestartGame(data);
          else if (this.onGameRestart) this.onGameRestart(data);
          break;

        case 'INPUT':
          if (this.isHost) {
            const keys = data.keys || data;
            if (this.onGuestInput) this.onGuestInput(keys);
            else if (this.onInput) this.onInput(keys);
          }
          break;

        case 'SNAPSHOT':
          if (!this.isHost && this.onSnapshot) {
            this.onSnapshot(data);
          }
          break;

        case 'PAUSE':
          if (this.onPause) this.onPause(data);
          break;

        case 'RESUME':
          if (this.onResume) this.onResume(data);
          break;

        case 'GAME_OVER':
          if (!this.isHost && this.onGameOver) this.onGameOver(data);
          break;

        case 'REQUEST_RESTART':
          if (this.isHost && this.onRequestRestart) this.onRequestRestart(data);
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
      const hostRole = config.hostRole || this.hostRole || 'red';
      const guestRole = (hostRole === 'red') ? 'blue' : 'red';
      const payload = {
        type: 'START_GAME',
        hostRole,
        guestRole,
        hostName: this.pilotName,
        guestName: this.peerPilotName,
        highScore: (typeof config.highScore === 'number') ? config.highScore : 0,
        powerMode: config.powerMode || 'dual',
        difficulty: config.difficulty || 'medium',
        timestamp: Date.now()
      };
      this.send(payload);
      return true;
    }

    sendStartGame(hostRole = 'red', highScore = 0) {
      return this.launchGame({ hostRole, highScore });
    }

    /**
     * Host broadcasts replay/restart after game over
     */
    restartGame() {
      if (!this.isHost || !this.conn || !this.conn.open) return false;
      this.send({ type: 'RESTART_GAME' });
      return true;
    }

    sendRestartGame() {
      return this.restartGame();
    }

    /**
     * Guest streams player input keys to Host
     */
    sendInput(keys) {
      if (!this.conn || !this.conn.open) return false;
      this.send({
        type: 'INPUT',
        keys
      });
      return true;
    }

    /**
     * Host broadcasts authoritative game snapshot to Guest
     */
    sendSnapshot(snapshot) {
      if (!this.conn || !this.conn.open) return false;
      this.send({
        type: 'SNAPSHOT',
        ...snapshot
      });
      return true;
    }

    /**
     * Either player broadcasts pause event
     */
    sendPause(pausedByName = '') {
      if (!this.conn || !this.conn.open) return false;
      this.send({
        type: 'PAUSE',
        pausedBy: (pausedByName || this.pilotName || (this.isHost ? 'Host' : 'Co-pilot')).trim().slice(0, 30),
        isHost: this.isHost,
        role: this.isHost ? this.hostRole : this.guestRole
      });
      return true;
    }

    /**
     * Either player broadcasts resume event
     */
    sendResume(resumedByName = '') {
      if (!this.conn || !this.conn.open) return false;
      this.send({
        type: 'RESUME',
        resumedBy: (resumedByName || this.pilotName || (this.isHost ? 'Host' : 'Co-pilot')).trim().slice(0, 30),
        isHost: this.isHost
      });
      return true;
    }

    /**
     * Host broadcasts authoritative game over packet
     */
    sendGameOver(data = {}) {
      if (!this.conn || !this.conn.open) return false;
      this.send({
        type: 'GAME_OVER',
        score: data.score || 0,
        highScore: data.highScore || 0,
        p1Kills: data.p1Kills || 0,
        p2Kills: data.p2Kills || 0
      });
      return true;
    }

    /**
     * Guest requests Host to restart mission
     */
    sendRestartRequest(name = '') {
      if (!this.conn || !this.conn.open) return false;
      this.send({
        type: 'REQUEST_RESTART',
        name: (name || this.pilotName || 'Co-pilot').trim().slice(0, 30)
      });
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
