/**
 * Reports Controller – MariaDB edition
 * DATE_TRUNC → DATE_FORMAT, ::date → DATE(), $N → ?
 */
const { query }   = require('../../config/database');
const { success } = require('../../utils/helpers');

const reportController = {
  // GET /api/reports/revenue?from=&to=&groupBy=day|month
  async revenue(req, res, next) {
    try {
      const { from, to, groupBy = 'day' } = req.query;
      const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const dateTo   = to   || new Date().toISOString().split('T')[0];

      const fmt = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
      const rows = await query(
        `SELECT DATE_FORMAT(created_at, ?) AS period,
                COUNT(*) AS bookings,
                COALESCE(SUM(total_amount),0) AS revenue,
                COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) AS paid_revenue
         FROM ticket_orders
         WHERE DATE(created_at) BETWEEN ? AND ? AND deleted_at IS NULL
         GROUP BY period ORDER BY period ASC`,
        [fmt, dateFrom, dateTo]
      );

      const [summary] = await query(
        `SELECT COUNT(*) AS total_bookings,
                COALESCE(SUM(total_amount),0) AS total_revenue,
                COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) AS paid_revenue
         FROM ticket_orders WHERE DATE(created_at) BETWEEN ? AND ? AND deleted_at IS NULL`,
        [dateFrom, dateTo]
      );

      return success(res, { data: rows, summary, dateFrom, dateTo });
    } catch (err) { next(err); }
  },

  // GET /api/reports/visitors?from=&to=
  async visitors(req, res, next) {
    try {
      const dateFrom = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const dateTo   = req.query.to   || new Date().toISOString().split('T')[0];

      const rows = await query(
        `SELECT o.visit_date AS date,
                COUNT(DISTINCT o.id) AS bookings,
                COALESCE(SUM(od.quantity),0) AS visitors
         FROM ticket_orders o
         JOIN order_details od ON od.order_id = o.id
         WHERE o.visit_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled','refunded') AND o.deleted_at IS NULL
         GROUP BY o.visit_date ORDER BY o.visit_date ASC`,
        [dateFrom, dateTo]
      );
      return success(res, { data: rows, dateFrom, dateTo });
    } catch (err) { next(err); }
  },

  // GET /api/reports/popular-attractions
  async popularAttractions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const rows  = await query(
        `SELECT ts.id, ts.name, ts.category, ts.city, ts.cover_image,
                COUNT(o.id) AS total_bookings,
                COALESCE(SUM(od.quantity),0) AS total_visitors,
                COALESCE(SUM(o.total_amount),0) AS revenue,
                ts.average_rating
         FROM tourist_sites ts
         LEFT JOIN ticket_orders o ON o.site_id=ts.id AND o.status NOT IN ('cancelled','refunded') AND o.deleted_at IS NULL
         LEFT JOIN order_details od ON od.order_id=o.id
         WHERE ts.deleted_at IS NULL
         GROUP BY ts.id, ts.name, ts.category, ts.city, ts.cover_image, ts.average_rating
         ORDER BY total_bookings DESC LIMIT ?`,
        [limit]
      );
      return success(res, { data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/reports/ticket-sales?from=&to=
  async ticketSales(req, res, next) {
    try {
      const dateFrom = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const dateTo   = req.query.to   || new Date().toISOString().split('T')[0];

      const rows = await query(
        `SELECT tt.name AS ticket_type,
                ts.name AS attraction_name,
                COUNT(od.id) AS transactions,
                SUM(od.quantity) AS tickets_sold,
                SUM(od.subtotal) AS revenue
         FROM order_details od
         JOIN ticket_types tt ON tt.id = od.ticket_type_id
         JOIN tourist_sites ts ON ts.id = tt.site_id
         JOIN ticket_orders o  ON o.id  = od.order_id
         WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status NOT IN ('cancelled','refunded') AND o.deleted_at IS NULL
         GROUP BY tt.name, ts.name ORDER BY tickets_sold DESC`,
        [dateFrom, dateTo]
      );
      return success(res, { data: rows, dateFrom, dateTo });
    } catch (err) { next(err); }
  },

  // GET /api/reports/qr-scans?from=&to=
  async qrScans(req, res, next) {
    try {
      const dateFrom = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const dateTo   = req.query.to   || new Date().toISOString().split('T')[0];

      const rows = await query(
        `SELECT DATE(qsl.scan_time) AS date,
                COUNT(*) AS total_scans,
                SUM(CASE WHEN qsl.result='valid' THEN 1 ELSE 0 END) AS valid_scans,
                SUM(CASE WHEN qsl.result!='valid' THEN 1 ELSE 0 END) AS failed_scans
         FROM qr_scan_logs qsl
         WHERE DATE(qsl.scan_time) BETWEEN ? AND ?
         GROUP BY DATE(qsl.scan_time) ORDER BY date ASC`,
        [dateFrom, dateTo]
      );
      return success(res, { data: rows, dateFrom, dateTo });
    } catch (err) { next(err); }
  },
};

module.exports = reportController;
