/**
 * Notification creation helper – saves to DB and emits via Socket.IO
 */
const { v4: uuidv4 } = require('uuid');
const NotificationModel = require('../models/NotificationModel');
const socketService     = require('./socketService');

async function send({ userId, type, title, message, data = {} }) {
  try {
    const notification = await NotificationModel.create({
      id: uuidv4(), userId, type, title, message, data,
    });
    socketService.onNewNotification(userId, notification);
    return notification;
  } catch (err) {
    // Non-critical – log but don't throw
    console.error('Notification send failed:', err.message);
  }
}

// ── Pre-defined notification types ─────────────────────────────────────────

const TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  TICKET_READY:      'ticket_ready',
  TICKET_USED:       'ticket_used',
  PAYMENT_RECEIVED:  'payment_received',
  REVIEW_REMINDER:   'review_reminder',
};

async function bookingConfirmed(userId, booking) {
  return send({
    userId,
    type:    TYPES.BOOKING_CONFIRMED,
    title:   'Booking Confirmed!',
    message: `Your booking ${booking.booking_code} for ${booking.attraction_name} has been confirmed.`,
    data:    { bookingId: booking.id, bookingCode: booking.booking_code },
  });
}

async function bookingCancelled(userId, booking, reason = '') {
  return send({
    userId,
    type:    TYPES.BOOKING_CANCELLED,
    title:   'Booking Cancelled',
    message: `Your booking ${booking.booking_code} has been cancelled. ${reason}`,
    data:    { bookingId: booking.id },
  });
}

async function ticketReady(userId, booking) {
  return send({
    userId,
    type:    TYPES.TICKET_READY,
    title:   'Your Tickets Are Ready!',
    message: `Tickets for ${booking.attraction_name} on ${booking.visit_date} are ready. Download them now.`,
    data:    { bookingId: booking.id },
  });
}

async function paymentReceived(userId, booking) {
  return send({
    userId,
    type:    TYPES.PAYMENT_RECEIVED,
    title:   'Payment Received',
    message: `We received your payment of Rp${Number(booking.total_amount).toLocaleString('id-ID')} for booking ${booking.booking_code}.`,
    data:    { bookingId: booking.id },
  });
}

module.exports = { send, bookingConfirmed, bookingCancelled, ticketReady, paymentReceived, TYPES };
