/**
 * Socket.IO Service – Extended with QR events
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
        socket.userId   = decoded.userId;
        socket.userRole = decoded.role;
      } catch (_) { /* anonymous */ }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId || 'anon'})`);

    if (socket.userId)   socket.join(`user:${socket.userId}`);
    if (['admin','super_admin','owner'].includes(socket.userRole)) socket.join('admins');
    if (socket.userRole === 'gate_officer') socket.join('gate');

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });

    // Gate officer joins their branch room
    socket.on('join:branch', (branchId) => {
      socket.join(`branch:${branchId}`);
    });
  });
}

function broadcast(event, data)          { if (io) io.emit(event, data); }
function emitToAdmins(event, data)       { if (io) io.to('admins').emit(event, data); }
function emitToGate(event, data)         { if (io) io.to('gate').emit(event, data); }
function emitToUser(userId, event, data) { if (io) io.to(`user:${userId}`).emit(event, data); }
function emitToBranch(branchId, event, data) { if (io) io.to(`branch:${branchId}`).emit(event, data); }

// ── Domain events ────────────────────────────────────────────────────────────

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

// ── QR-specific events ───────────────────────────────────────────────────────

function onQRGenerated(qr) {
  emitToAdmins('qr:generated', {
    id:          qr.id,
    uuid:        qr.uuid,
    site_name:   qr.site_name,
    branch_name: qr.branch_name,
    expires_at:  qr.expires_at,
    created_at:  qr.created_at,
  });
  emitToAdmins('dashboard:refresh', { type: 'qr' });
}

function onQRScanned({ qrId, result, visitorName, ticketType, siteId, branchId, scanTime }) {
  const payload = { qrId, result, visitorName, ticketType, siteId, scanTime: scanTime || new Date().toISOString() };
  emitToAdmins('qr:scanned', payload);
  emitToGate('qr:scanned', payload);
  if (branchId) emitToBranch(branchId, 'qr:scanned', payload);
  emitToAdmins('dashboard:refresh', { type: 'scan' });
}

function onVisitorEntry({ siteId, visitorName, ticketType, scanTime }) {
  const payload = { siteId, visitorName, ticketType, scanTime: scanTime || new Date().toISOString() };
  emitToAdmins('visitor:entry', payload);
  emitToAdmins('dashboard:refresh', { type: 'visitor' });
}

function onPaymentSuccess(payment) {
  emitToAdmins('payment:success', payment);
  if (payment.user_id) emitToUser(payment.user_id, 'payment:success', payment);
  emitToAdmins('dashboard:refresh', { type: 'payment' });
}

module.exports = {
  init, broadcast,
  emitToAdmins, emitToGate, emitToUser, emitToBranch,
  onBookingCreated, onBookingConfirmed, onBookingCancelled,
  onTicketUsed, onNewNotification, onDashboardUpdate,
  onQRGenerated, onQRScanned, onVisitorEntry, onPaymentSuccess,
};
