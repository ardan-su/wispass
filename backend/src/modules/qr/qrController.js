/**
 * QR Controller
 * Handles all Admin QR management endpoints.
 */
const { v4: uuid } = require('uuid');
const QRModel      = require('./qrModel');
const qrService    = require('./qrService');
const socketSvc    = require('../../sockets/socketService');
const { success, error, getPagination, paginate } = require('../../utils/helpers');
const logger       = require('../../utils/logger');

const qrController = {
  // ── POST /api/admin/qr/create ─────────────────────────────────────────────
  async create(req, res, next) {
    try {
      const { ticketId, orderId, siteId, branchId, label, expiryHours, maxScans } = req.body;
      const generatedBy = req.user.id;

      const qrRecord = await qrService.generateQR({
        generatedBy, ticketId, orderId, siteId, branchId,
        label, expiryHours: expiryHours || undefined,
        maxScans: maxScans || 1,
      });

      const saved = await QRModel.create(qrRecord);
      logger.info(`QR generated: ${saved.uuid} by ${req.user.email}`);

      // Real-time broadcast
      socketSvc.onQRGenerated(saved);

      return success(res, { qr: saved }, 'QR code generated successfully.', 201);
    } catch (err) { next(err); }
  },

  // ── GET /api/admin/qr ─────────────────────────────────────────────────────
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, status, siteId, branchId, dateFrom, dateTo } = req.query;

      const { rows, total } = await QRModel.findAll({
        limit, offset, search, status, siteId, branchId, dateFrom, dateTo,
      });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // ── GET /api/admin/qr/stats ──────────────────────────────────────────────
  async stats(req, res, next) {
    try {
      const stats = await QRModel.getStats();
      return success(res, { stats });
    } catch (err) { next(err); }
  },

  // ── GET /api/admin/qr/history ─────────────────────────────────────────────
  async history(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { siteId, result, dateFrom, dateTo } = req.query;
      const rows = await QRModel.getAllScanHistory({
        limit, offset, siteId, result, dateFrom, dateTo,
      });
      return res.json({ data: rows, pagination: { page, limit } });
    } catch (err) { next(err); }
  },

  // ── GET /api/admin/qr/:id ─────────────────────────────────────────────────
  async detail(req, res, next) {
    try {
      const qr = await QRModel.findById(req.params.id);
      if (!qr) return error(res, 'QR code not found.', 404);

      const history = await QRModel.getScanHistory(qr.id);
      return success(res, { qr, history });
    } catch (err) { next(err); }
  },

  // ── PUT /api/admin/qr/:id ─────────────────────────────────────────────────
  async update(req, res, next) {
    try {
      const qr = await QRModel.findById(req.params.id);
      if (!qr) return error(res, 'QR code not found.', 404);

      const { status, notes } = req.body;
      const allowedStatuses = ['active', 'deactivated'];
      if (status && !allowedStatuses.includes(status)) {
        return error(res, `Status must be one of: ${allowedStatuses.join(', ')}.`, 400);
      }

      if (status) await QRModel.updateStatus(req.params.id, status);
      if (notes !== undefined) {
        const { query } = require('../../config/database');
        await query(`UPDATE qr_codes SET notes = ? WHERE id = ?`, [notes, req.params.id]);
      }

      const updated = await QRModel.findById(req.params.id);
      return success(res, { qr: updated }, 'QR code updated.');
    } catch (err) { next(err); }
  },

  // ── DELETE /api/admin/qr/:id ──────────────────────────────────────────────
  async remove(req, res, next) {
    try {
      const qr = await QRModel.findById(req.params.id);
      if (!qr) return error(res, 'QR code not found.', 404);

      await QRModel.softDelete(req.params.id);
      logger.info(`QR soft-deleted: ${qr.uuid} by ${req.user.email}`);
      return success(res, {}, 'QR code deleted.');
    } catch (err) { next(err); }
  },

  // ── POST /api/admin/qr/:id/regenerate ────────────────────────────────────
  async regenerate(req, res, next) {
    try {
      const old = await QRModel.findById(req.params.id);
      if (!old) return error(res, 'QR code not found.', 404);
      if (!['active', 'deactivated'].includes(old.status)) {
        return error(res, 'Can only regenerate active or deactivated QR codes.', 400);
      }

      // Deactivate old
      await QRModel.updateStatus(req.params.id, 'deactivated');

      // Generate new
      const newQR = await qrService.generateQR({
        generatedBy: req.user.id,
        ticketId:    old.ticket_id,
        orderId:     old.order_id,
        siteId:      old.site_id,
        branchId:    old.branch_id,
        label:       old.notes,
        maxScans:    old.max_scans,
      });

      const saved = await QRModel.create(newQR);
      socketSvc.onQRGenerated(saved);
      return success(res, { qr: saved }, 'QR code regenerated.');
    } catch (err) { next(err); }
  },

  // ── POST /api/admin/qr/scan ───────────────────────────────────────────────
  async scan(req, res, next) {
    try {
      const { qrData, gateDeviceId } = req.body;
      if (!qrData) return error(res, 'QR data is required.', 400);

      // Parse and verify signature/payload
      const verifyResult = qrService.verifyQR(qrData);

      if (!verifyResult.valid) {
        // Log failed scan even if QR not found
        logger.warn(`QR scan failed (signature): ${verifyResult.reason}`);
        return res.status(400).json({
          success: false,
          result: 'invalid',
          message: verifyResult.reason,
          status: 'invalid',
        });
      }

      const payload = verifyResult.payload;
      const qrUuid  = payload?.uuid;

      // Look up DB record
      const qr = qrUuid ? await QRModel.findByUuid(qrUuid) : null;

      const scanLogBase = {
        id: uuid(),
        qrId: qr?.id,
        scannedBy: req.user?.id || null,
        gateDeviceId: gateDeviceId || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      if (!qr) {
        await logScanSafe({ ...scanLogBase, result: 'not_found', notes: 'QR UUID not in database' });
        return res.status(404).json({
          success: false, result: 'not_found', message: 'QR code not found in database.', status: 'not_found',
        });
      }

      // Check status
      if (qr.status === 'expired' || new Date(qr.expires_at) < new Date()) {
        await QRModel.updateStatus(qr.id, 'expired');
        await logScanSafe({ ...scanLogBase, qrId: qr.id, result: 'expired',
          visitorName: qr.visitor_name, ticketType: qr.ticket_type_name });
        socketSvc.onQRScanned({ qrId: qr.uuid, result: 'expired', siteId: qr.site_id });
        return res.status(400).json({
          success: false, result: 'expired', message: 'QR code has expired.', status: 'expired',
          scan_time: new Date().toISOString(),
        });
      }

      if (qr.status === 'deactivated') {
        await logScanSafe({ ...scanLogBase, qrId: qr.id, result: 'invalid', notes: 'QR deactivated' });
        return res.status(400).json({
          success: false, result: 'invalid', message: 'QR code has been deactivated.', status: 'deactivated',
        });
      }

      if (qr.scan_count >= qr.max_scans) {
        await logScanSafe({ ...scanLogBase, qrId: qr.id, result: 'used',
          visitorName: qr.visitor_name, ticketType: qr.ticket_type_name });
        socketSvc.onQRScanned({ qrId: qr.uuid, result: 'used', siteId: qr.site_id });
        return res.status(400).json({
          success: false, result: 'used', message: 'QR code has already been used.', status: 'used',
          scan_time: new Date().toISOString(),
        });
      }

      // ✅ VALID SCAN
      await QRModel.incrementScanCount(qr.id);
      if (qr.scan_count + 1 >= qr.max_scans) {
        await QRModel.updateStatus(qr.id, 'used');
      }

      const scanLog = {
        ...scanLogBase,
        qrId:        qr.id,
        result:      'valid',
        visitorName: qr.visitor_name || null,
        ticketType:  qr.ticket_type_name || null,
      };
      await logScanSafe(scanLog);

      const scanTime = new Date().toISOString();
      socketSvc.onQRScanned({
        qrId:        qr.uuid,
        result:      'valid',
        visitorName: qr.visitor_name,
        ticketType:  qr.ticket_type_name,
        siteId:      qr.site_id,
        scanTime,
      });
      socketSvc.onVisitorEntry({
        siteId:      qr.site_id,
        visitorName: qr.visitor_name,
        ticketType:  qr.ticket_type_name,
        scanTime,
      });

      return success(res, {
        success:      true,
        result:       'valid',
        status:       'valid',
        visitor_name: qr.visitor_name || 'Guest',
        ticket_type:  qr.ticket_type_name || 'N/A',
        ticket_code:  qr.ticket_code || null,
        site_name:    qr.site_name,
        scan_time:    scanTime,
        scans_remaining: Math.max(0, qr.max_scans - qr.scan_count - 1),
      }, 'QR validated successfully.');
    } catch (err) { next(err); }
  },

  // ── GET /api/admin/qr/:id/download/png ───────────────────────────────────
  async downloadPng(req, res, next) {
    try {
      const qr = await QRModel.findById(req.params.id);
      if (!qr) return error(res, 'QR code not found.', 404);

      const buf = qrService.getQRPngBuffer(qr.qr_image);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qr-${qr.uuid.substring(0,8)}.png"`);
      return res.send(buf);
    } catch (err) { next(err); }
  },

  // ── GET /api/admin/qr/:id/download/pdf ───────────────────────────────────
  async downloadPdf(req, res, next) {
    try {
      const qr = await QRModel.findById(req.params.id);
      if (!qr) return error(res, 'QR code not found.', 404);

      const html = qrService.generateQRHtml(qr, {
        name:   qr.site_name,
        branch: qr.branch_name,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="qr-${qr.uuid.substring(0,8)}.html"`);
      return res.send(html);
    } catch (err) { next(err); }
  },
};

async function logScanSafe(params) {
  try { await QRModel.logScan(params); } catch (e) { logger.error('logScan error:', e.message); }
}

module.exports = qrController;
