/**
 * Socket.IO Service
 * Manages real-time event broadcasting.
 */
const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

function init(socketIO) {
  io = socketIO;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
      } catch (_) { /* anonymous connection */ }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId || 'anon'})`);

    // Join personal room for targeted notifications
    if (socket.userId) socket.join(`user:${socket.userId}`);

    // Admins join admin room
    if (socket.userRole === 'admin') socket.join('admins');

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });
}

/** Emit to all connected clients */
function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}

/** Emit only to admin sockets */
function emitToAdmins(event, data) {
  if (!io) return;
  io.to('admins').emit(event, data);
}

/** Emit to a specific user */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// ── Domain events ─────────────────────────────────────────────────────────────
function onBookingCreated(booking) {
  emitToAdmins('booking:created', booking);
  emitToUser(booking.user_id, 'booking:created', booking);
  emitToAdmins('dashboard:refresh', { type: 'booking' });
}

function onBookingConfirmed(booking) {
  emitToUser(booking.user_id, 'booking:confirmed', booking);
  emitToAdmins('dashboard:refresh', { type: 'booking' });
}

function onBookingCancelled(booking) {
  emitToUser(booking.user_id, 'booking:cancelled', booking);
  emitToAdmins('booking:cancelled', booking);
  emitToAdmins('dashboard:refresh', { type: 'booking' });
}

function onTicketUsed(ticket) {
  emitToAdmins('ticket:used', ticket);
  emitToUser(ticket.user_id, 'ticket:used', ticket);
  emitToAdmins('dashboard:refresh', { type: 'visitor' });
}

function onNewNotification(userId, notification) {
  emitToUser(userId, 'notification:new', notification);
}

function onDashboardUpdate(data) {
  emitToAdmins('dashboard:update', data);
}

module.exports = {
  init,
  broadcast,
  emitToAdmins,
  emitToUser,
  onBookingCreated,
  onBookingConfirmed,
  onBookingCancelled,
  onTicketUsed,
  onNewNotification,
  onDashboardUpdate,
};
