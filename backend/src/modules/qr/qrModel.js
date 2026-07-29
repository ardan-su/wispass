/**
 * QR Model – MariaDB CRUD for qr_codes and qr_scan_logs
 */
const { query } = require('../../config/database');

const QRModel = {
  // ─── CREATE ─────────────────────────────────────────────────────────────────
  async create({ id, uuid, ticketId, orderId, siteId, branchId, generatedBy,
                 qrImage, qrData, payloadHash, signature, status, maxScans,
                 validFrom, expiresAt, notes }) {
    await query(
      `INSERT INTO qr_codes
         (id, uuid, ticket_id, order_id, site_id, branch_id, generated_by,
          qr_image, qr_data, payload_hash, signature, status, max_scans,
          valid_from, expires_at, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, uuid, ticketId || null, orderId || null, siteId || null, branchId || null,
       generatedBy, qrImage, qrData, payloadHash, signature, status || 'active',
       maxScans || 1, validFrom, expiresAt, notes || null]
    );
    return this.findById(id);
  },

  // ─── READ ────────────────────────────────────────────────────────────────────
  async findById(id) {
    const rows = await query(
      `SELECT qc.*,
              u.full_name AS generated_by_name, u.email AS generated_by_email,
              ts.name AS site_name,
              b.name  AS branch_name,
              t.ticket_code, t.visit_date,
              tt.name AS ticket_type_name
       FROM qr_codes qc
       LEFT JOIN users u         ON u.id  = qc.generated_by
       LEFT JOIN tourist_sites ts ON ts.id = qc.site_id
       LEFT JOIN branches b       ON b.id  = qc.branch_id
       LEFT JOIN tickets t        ON t.id  = qc.ticket_id
       LEFT JOIN ticket_types tt  ON tt.id = t.ticket_type_id
       WHERE qc.id = ? AND qc.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  async findByUuid(uuid) {
    const rows = await query(
      `SELECT qc.*,
              u.full_name AS generated_by_name,
              ts.name AS site_name,
              b.name  AS branch_name,
              t.ticket_code, t.visit_date, t.status AS ticket_status,
              tt.name AS ticket_type_name,
              o_user.full_name AS visitor_name
       FROM qr_codes qc
       LEFT JOIN users u          ON u.id   = qc.generated_by
       LEFT JOIN tourist_sites ts  ON ts.id  = qc.site_id
       LEFT JOIN branches b        ON b.id   = qc.branch_id
       LEFT JOIN tickets t         ON t.id   = qc.ticket_id
       LEFT JOIN ticket_types tt   ON tt.id  = t.ticket_type_id
       LEFT JOIN ticket_orders o   ON o.id   = qc.order_id
       LEFT JOIN users o_user      ON o_user.id = o.user_id
       WHERE qc.uuid = ? AND qc.deleted_at IS NULL`,
      [uuid]
    );
    return rows[0] || null;
  },

  async findAll({ limit = 10, offset = 0, search, status, siteId, branchId,
                  generatedBy, dateFrom, dateTo } = {}) {
    let sql  = `
      SELECT qc.id, qc.uuid, qc.status, qc.scan_count, qc.max_scans,
             qc.valid_from, qc.expires_at, qc.last_scanned_at, qc.created_at, qc.notes,
             u.full_name AS generated_by_name,
             ts.name AS site_name, ts.city AS site_city,
             b.name  AS branch_name,
             t.ticket_code, t.visit_date,
             tt.name AS ticket_type_name
      FROM qr_codes qc
      LEFT JOIN users u          ON u.id  = qc.generated_by
      LEFT JOIN tourist_sites ts  ON ts.id = qc.site_id
      LEFT JOIN branches b        ON b.id  = qc.branch_id
      LEFT JOIN tickets t         ON t.id  = qc.ticket_id
      LEFT JOIN ticket_types tt   ON tt.id = t.ticket_type_id
      WHERE qc.deleted_at IS NULL`;
    let cSql = `SELECT COUNT(*) AS total FROM qr_codes qc WHERE qc.deleted_at IS NULL`;
    const params  = [];
    const cParams = [];

    function addCond(clause, ...vals) {
      sql   += clause; params.push(...vals);
      cSql  += clause; cParams.push(...vals);
    }

    if (search) {
      const like = `%${search}%`;
      addCond(` AND (qc.uuid LIKE ? OR t.ticket_code LIKE ? OR u.full_name LIKE ?)`, like, like, like);
    }
    if (status)      addCond(` AND qc.status = ?`, status);
    if (siteId)      addCond(` AND qc.site_id = ?`, siteId);
    if (branchId)    addCond(` AND qc.branch_id = ?`, branchId);
    if (generatedBy) addCond(` AND qc.generated_by = ?`, generatedBy);
    if (dateFrom)    addCond(` AND DATE(qc.created_at) >= ?`, dateFrom);
    if (dateTo)      addCond(` AND DATE(qc.created_at) <= ?`, dateTo);

    const cr    = await query(cSql, cParams);
    const total = parseInt(cr[0].total);

    params.push(limit, offset);
    sql += ` ORDER BY qc.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query(sql, params);
    return { rows, total };
  },

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  async updateStatus(id, status) {
    await query(`UPDATE qr_codes SET status = ? WHERE id = ?`, [status, id]);
    return this.findById(id);
  },

  async incrementScanCount(id) {
    await query(
      `UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = NOW() WHERE id = ?`,
      [id]
    );
  },

  async softDelete(id) {
    await query(`UPDATE qr_codes SET deleted_at = NOW(), status = 'deleted' WHERE id = ?`, [id]);
  },

  // ─── SCAN LOGS ───────────────────────────────────────────────────────────────
  async logScan({ id, qrId, scannedBy, gateDeviceId, result, visitorName, ticketType,
                  ipAddress, userAgent, notes }) {
    await query(
      `INSERT INTO qr_scan_logs
         (id, qr_id, scanned_by, gate_device_id, result, visitor_name, ticket_type,
          ip_address, user_agent, notes, scan_time)
       VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
      [id, qrId, scannedBy || null, gateDeviceId || null, result,
       visitorName || null, ticketType || null,
       ipAddress || null, userAgent?.substring(0, 499) || null, notes || null]
    );
  },

  async getScanHistory(qrId, { limit = 20, offset = 0 } = {}) {
    return query(
      `SELECT qsl.*, u.full_name AS scanner_name, u.role AS scanner_role
       FROM qr_scan_logs qsl
       LEFT JOIN users u ON u.id = qsl.scanned_by
       WHERE qsl.qr_id = ?
       ORDER BY qsl.scan_time DESC
       LIMIT ? OFFSET ?`,
      [qrId, limit, offset]
    );
  },

  async getAllScanHistory({ limit = 20, offset = 0, siteId, result, dateFrom, dateTo } = {}) {
    let sql  = `
      SELECT qsl.*, qc.uuid AS qr_uuid, qc.site_id,
             u.full_name AS scanner_name,
             ts.name AS site_name,
             t.ticket_code
      FROM qr_scan_logs qsl
      JOIN qr_codes qc       ON qc.id = qsl.qr_id
      LEFT JOIN users u       ON u.id  = qsl.scanned_by
      LEFT JOIN tourist_sites ts ON ts.id = qc.site_id
      LEFT JOIN tickets t     ON t.id  = qc.ticket_id
      WHERE 1=1`;
    const params = [];

    if (siteId)  { sql += ` AND qc.site_id = ?`; params.push(siteId); }
    if (result)  { sql += ` AND qsl.result = ?`;  params.push(result); }
    if (dateFrom) { sql += ` AND DATE(qsl.scan_time) >= ?`; params.push(dateFrom); }
    if (dateTo)   { sql += ` AND DATE(qsl.scan_time) <= ?`; params.push(dateTo); }

    params.push(limit, offset);
    sql += ` ORDER BY qsl.scan_time DESC LIMIT ? OFFSET ?`;
    return query(sql, params);
  },

  // ─── STATS ───────────────────────────────────────────────────────────────────
  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const [active, expired, todayScans, total] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM qr_codes WHERE status='active' AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS c FROM qr_codes WHERE status='expired' AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS c FROM qr_scan_logs WHERE DATE(scan_time)=?`, [today]),
      query(`SELECT COUNT(*) AS c FROM qr_codes WHERE deleted_at IS NULL`),
    ]);
    return {
      active:     parseInt(active[0].c),
      expired:    parseInt(expired[0].c),
      todayScans: parseInt(todayScans[0].c),
      total:      parseInt(total[0].c),
    };
  },

  // ─── AUTO-EXPIRE ─────────────────────────────────────────────────────────────
  async expireOld() {
    const result = await query(
      `UPDATE qr_codes SET status='expired' WHERE status='active' AND expires_at < NOW() AND deleted_at IS NULL`
    );
    return result.affectedRows || 0;
  },
};

module.exports = QRModel;
