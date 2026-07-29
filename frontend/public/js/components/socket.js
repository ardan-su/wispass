/**
 * Socket.IO client wrapper
 */
let _socket = null;

export const socket = {
  connect(token) {
    if (_socket?.connected) return;
    // Socket.IO is loaded via CDN script tag (added dynamically)
    if (typeof io === 'undefined') {
      const s = document.createElement('script');
      s.src = '/socket.io/socket.io.js';
      s.onload = () => this._init(token);
      document.head.appendChild(s);
    } else {
      this._init(token);
    }
  },

  _init(token) {
    _socket = io({ auth: { token }, transports: ['websocket', 'polling'] });

    _socket.on('connect', () => console.log('Socket connected:', _socket.id));
    _socket.on('disconnect', () => console.log('Socket disconnected'));

    // Global notification listener
    _socket.on('notification:new', (n) => {
      window.toast?.info(n.title, n.message);
      // Update badge
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

  on(event, cb) {
    _socket?.on(event, cb);
  },

  off(event, cb) {
    _socket?.off(event, cb);
  },

  disconnect() {
    _socket?.disconnect();
    _socket = null;
  },
};
