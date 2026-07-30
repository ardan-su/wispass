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
  // GET /api/tickets/admin/all  – admin view of all tickets across all customers
  async adminList(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, status, siteId, dateFrom, dateTo, userId } = req.query;

      let sql = `
        SELECT t.id, t.ticket_code, t.status, t.visit_date, t.used_at,
               t.expires_at, t.created_at, t.qr_code, t.qr_data,
               u.id AS user_id, u.full_name AS customer_name, u.email AS customer_email,
               ts.id AS site_id, ts.name AS attraction_name, ts.city, ts.cover_image,
               tt.name AS ticket_type_name, tt.id AS ticket_type_id,
               o.id AS order_id, o.booking_code
        FROM tickets t
        JOIN users u         ON u.id  = t.user_id
        JOIN tourist_sites ts ON ts.id = t.site_id
        JOIN ticket_types tt  ON tt.id = t.ticket_type_id
        JOIN ticket_orders o  ON o.id  = t.order_id
        WHERE 1=1`;
      let cSql = `SELECT COUNT(*) AS total
        FROM tickets t
        JOIN users u         ON u.id  = t.user_id
        JOIN tourist_sites ts ON ts.id = t.site_id
        JOIN ticket_orders o  ON o.id  = t.order_id
        WHERE 1=1`;
      const params  = [];
      const cParams = [];

      function addCond(clause, ...vals) {
        sql   += clause; params.push(...vals);
        cSql  += clause; cParams.push(...vals);
      }

      if (search) {
        const like = `%${search}%`;
        addCond(` AND (t.ticket_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR o.booking_code LIKE ?)`,
          like, like, like, like);
      }
      if (status)   addCond(` AND t.status = ?`, status);
      if (siteId)   addCond(` AND t.site_id = ?`, siteId);
      if (userId)   addCond(` AND t.user_id = ?`, userId);
      if (dateFrom) addCond(` AND t.visit_date >= ?`, dateFrom);
      if (dateTo)   addCond(` AND t.visit_date <= ?`, dateTo);

      const cr    = await query(cSql, cParams);
      const total = parseInt(cr[0].total);

      params.push(limit, offset);
      sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
      const rows = await query(sql, params);

      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/tickets/admin/stats – summary counts per status
  async adminStats(req, res, next) {
    try {
      const rows = await query(
        `SELECT status, COUNT(*) AS count FROM tickets GROUP BY status`
      );
      const stats = { active: 0, used: 0, expired: 0, cancelled: 0, total: 0 };
      rows.forEach(r => {
        const s = r.status;
        const n = parseInt(r.count);
        if (stats[s] !== undefined) stats[s] = n;
        stats.total += n;
      });
      // Today's used tickets
      const todayRows = await query(
        `SELECT COUNT(*) AS count FROM tickets WHERE status = 'used' AND DATE(used_at) = CURDATE()`
      );
      stats.used_today = parseInt(todayRows[0].count);
      return success(res, { stats });
    } catch (err) { next(err); }
  },

  // PUT /api/tickets/admin/:id/status – admin can change status (cancel/expire)
  async adminUpdateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const allowed = ['cancelled', 'expired'];
      if (!allowed.includes(status)) return error(res, `Status must be one of: ${allowed.join(', ')}.`, 400);

      const ticket = await TicketModel.findById(req.params.id);
      if (!ticket) return error(res, 'Ticket not found.', 404);
      if (ticket.status === 'used') return error(res, 'Cannot change status of a used ticket.', 400);

      const updated = await TicketModel.updateStatus(ticket.id, status);
      socketSvc.onTicketUsed(updated); // reuse existing socket event to push status change

      return success(res, { ticket: updated }, `Ticket marked as ${status}.`);
    } catch (err) { next(err); }
  },
};

module.exports = ticketController;
