/**
 * Shared utility helpers – MariaDB edition
 */

/** Paginate helper — returns { limit, offset, page } from query params */
function getPagination(queryParams) {
  const page   = Math.max(1, parseInt(queryParams.page)  || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** Build a paginated API response envelope */
function paginate(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/** Standard success response */
function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, ...data });
}

/** Standard error response */
function error(res, message = 'An error occurred', statusCode = 500, details = null) {
  const body = { success: false, message };
  if (details && process.env.NODE_ENV !== 'production') body.details = details;
  return res.status(statusCode).json(body);
}

/** Generate a booking code like WP-20240115-ABCD */
function generateBookingCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WP-${date}-${rand}`;
}

/** Generate a payment code */
function generatePaymentCode() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY-${ts}-${rand}`;
}

/** Generate a ticket code */
function generateTicketCode() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

/** Generate a secure random validation token (32 hex bytes) */
function generateValidationToken() {
  const { randomBytes } = require('crypto');
  return randomBytes(32).toString('hex');
}

/** Check whether a date is a weekend */
function isWeekend(date) {
  const d = new Date(date);
  return d.getDay() === 0 || d.getDay() === 6;
}

/** Format currency to IDR */
function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

/** Slugify a string */
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Parse MySQL/MariaDB boolean (returns 0/1, need to coerce) */
function bool(val) {
  return val === 1 || val === true || val === '1';
}

/** Strip HTML tags and trim whitespace from a string value */
function sanitize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

module.exports = {
  getPagination, paginate, success, error,
  generateBookingCode, generatePaymentCode, generateTicketCode,
  generateValidationToken, isWeekend, formatIDR, slugify, bool, sanitize,
};
