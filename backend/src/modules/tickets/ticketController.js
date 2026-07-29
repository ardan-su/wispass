/**
 * Ticket Controller – MariaDB
 */
const { v4: uuid }   = require('uuid');
const TicketModel    = require('./TicketModel');
const qrService      = require('../qr/qrService');
const socketSvc      = require('../../sockets/socketService');
const { query }      = require('../../config/database');
const { success, error, getPagination, paginate } = require('../../utils/helpers');

const ticketController = {
  // GET /api/tickets
  async listMine(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { status } = req.query;
      const { rows, total } = await TicketModel.findByUser(req.user.id, { status, limit, offset });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/tickets/:id
  async detail(req, res, next) {
    try {
      const ticket = await TicketModel.findById(req.params.id);
      if (!ticket) return error(res, 'Ticket not found.', 404);
      if (req.user.role === 'customer' && ticket.user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);
      const history = await TicketModel.getValidationHistory(ticket.id);
      return success(res, { ticket, history });
    } catch (err) { next(err); }
  },

  // GET /api/tickets/code/:code
  async findByCode(req, res, next) {
    try {
      const ticket = await TicketModel.findByCode(req.params.code);
      if (!ticket) return error(res, 'Ticket not found.', 404);
      const history = await TicketModel.getValidationHistory(ticket.id);
      return success(res, { ticket, history });
    } catch (err) { next(err); }
  },

  // POST /api/tickets/validate
  async validate(req, res, next) {
    try {
      const { qrData, ticketCode } = req.body;
      let ticket;

      if (qrData) {
        let parsed;
        try { parsed = JSON.parse(qrData); } catch {
          return error(res, 'Invalid QR data.', 400);
        }
        const token = parsed.validationToken || parsed.d;
        ticket = parsed.validationToken
          ? await TicketModel.findByToken(parsed.validationToken)
          : null;
        if (!ticket && parsed.v === 2) {
          // New QR format – validate via QR module
          return res.redirect(307, '/api/admin/qr/scan');
        }
        if (!ticket) return error(res, 'Ticket not found for this QR code.', 404);

        const verify = qrService.verifyQRPayload(qrData, ticket.validation_token);
        if (!verify.valid) {
          await TicketModel.logValidation({ id: uuid(), ticketId: ticket.id, validatedBy: req.user.id, result: 'invalid', notes: verify.reason });
          return error(res, verify.reason, 400);
        }
      } else if (ticketCode) {
        ticket = await TicketModel.findByCode(ticketCode);
        if (!ticket) return error(res, 'Ticket not found.', 404);
      } else {
        return error(res, 'QR data or ticket code required.', 400);
      }

      const today = new Date().toISOString().split('T')[0];
      let result = 'valid', reason = null;

      if (ticket.status === 'used')      { result = 'used';      reason = `Ticket already used at ${ticket.used_at}.`; }
      else if (ticket.status === 'cancelled') { result = 'cancelled'; reason = 'Ticket has been cancelled.'; }
      else if (ticket.status === 'expired')   { result = 'expired';   reason = 'Ticket has expired.'; }
      else {
        const vDate = ticket.visit_date instanceof Date
          ? ticket.visit_date.toISOString().split('T')[0]
          : String(ticket.visit_date).split('T')[0];
        if (vDate !== today) { result = 'expired'; reason = `Ticket is valid for ${vDate}, not today.`; }
      }

      await TicketModel.logValidation({ id: uuid(), ticketId: ticket.id, validatedBy: req.user.id, result, notes: reason });
      if (result !== 'valid') return res.status(400).json({ success: false, message: reason, result, ticket });

      const updated = await TicketModel.updateStatus(ticket.id, 'used');
      socketSvc.onTicketUsed(updated);

      return success(res, { result: 'valid', ticket: updated }, 'Ticket validated successfully.');
    } catch (err) { next(err); }
  },

  // POST /api/tickets/:id/regenerate-qr
  async regenerateQR(req, res, next) {
    try {
      const ticket = await TicketModel.findById(req.params.id);
      if (!ticket) return error(res, 'Ticket not found.', 404);
      if (req.user.role === 'customer' && ticket.user_id !== req.user.id) return error(res, 'Forbidden.', 403);
      if (ticket.status !== 'active') return error(res, 'Can only regenerate QR for active tickets.', 400);

      const { qrCode, qrData } = await qrService.generateTicketQR(ticket);
      await query(`UPDATE tickets SET qr_code=?, qr_data=? WHERE id=?`, [qrCode, qrData, ticket.id]);

      return success(res, { qrCode, ticketCode: ticket.ticket_code }, 'QR code regenerated.');
    } catch (err) { next(err); }
  },
};

module.exports = ticketController;
