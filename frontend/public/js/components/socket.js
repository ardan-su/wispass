/**
 * Socket.IO client wrapper
 *
 * In development (backend + frontend on same origin): API_BASE_URL = ''
 * In production (separate domains): set window.APP_CONFIG.API_BASE_URL
 *   to the backend URL before this script loads, e.g.:
 *   window.APP_CONFIG = { API_BASE_URL: 'https://smarticket-api.projects-me.id' }
 */
const _apiBase = () => (window.APP_CONFIG?.API_BASE_URL || '');

let _socket = null;

export const socket = {
  connect(token) {
    if (_socket?.connected) return;

    const base = _apiBase();

    if (typeof io === 'undefined') {
      const s = document.createElement('script');
      // Use explicit backend URL so the script resolves to the API server,
      // not the frontend domain (fixes cross-domain Socket.IO bug)
      s.src = base ? `${base}/socket.io/socket.io.js` : '/socket.io/socket.io.js';
      s.onerror = () => console.warn('[Socket] Failed to load socket.io.js from', s.src,
        '— check that API_BASE_URL is correct and the backend is reachable.');
      s.onload = () => this._init(token, base);
      document.head.appendChild(s);
    } else {
      this._init(token, base);
    }
  },

  _init(token, base = '') {
    // Pass explicit URL when on a different domain; omit for same-origin
    _socket = base
      ? io(base, { auth: { token }, transports: ['websocket', 'polling'] })
      : io(      { auth: { token }, transports: ['websocket', 'polling'] });

    window._socket = _socket;

    _socket.on('connect', () =>
      console.log('[Socket] Connected:', _socket.id));

    _socket.on('disconnect', (reason) =>
      console.log('[Socket] Disconnected:', reason));

    _socket.on('connect_error', (err) =>
      console.warn('[Socket] Connection error:', err.message,
        '— API_BASE_URL:', base || '(same origin)'));

    // Global notification listener
    _socket.on('notification:new', (n) => {
      window.toast?.info(n.title, n.message);
      const badge = document.getElementById('notif-badge');
      if (badge) {
        const cur = parseInt(badge.textContent) || 0;
        badge.textContent = cur + 1;
        badge.classList.remove('hidden');
      }
    });

    // Dashboard realtime refresh
    _socket.on('dashboard:refresh', () => {
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    });
  },

  on(event, cb)  { _socket?.on(event, cb); },
  off(event, cb) { _socket?.off(event, cb); },

  disconnect() {
    _socket?.disconnect();
    _socket = null;
  },
};
