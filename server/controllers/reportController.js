const { query }  = require('../config/database');
const { success, error } = require('../utils/helpers');

const reportController = {
  // GET /api/reports/revenue?from=&to=&groupBy=day|month
  async revenue(req, res, next) {
    try {
      const { from, to, groupBy = 'day' } = req.query;
      const dateFrom = from || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
      const dateTo   = to   || new Date().toISOString().split('T')[0];

      const trunc = groupBy === 'month' ? 'month' : 'day';
      const { rows } = await query(
        `SELECT DATE_TRUNC($1, created_at)::date AS period,
                COUNT(*) AS bookings,
                COALESCE(SUM(total_amount),0) AS revenue,
                COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) AS paid_revenue
         FROM bookings
         WHERE created_at::date BETWEEN $2 AND $3
         GROUP BY period ORDER BY period ASC`,
        [trunc, dateFrom, dateTo]
      );

      const totals = await query(
        `SELECT COUNT(*) AS total_bookings,
                COALESCE(SUM(total_amount),0) AS total_revenue,
                COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) AS paid_revenue
         FROM bookings WHERE created_at::date BETWEEN $1 AND $2`,
        [dateFrom, dateTo]
      );

      return success(res, { data: rows, summary: totals.rows[0], dateFrom, dateTo });
    } catch (err) { next(err); }
  },

  // GET /api/reports/visitors?from=&to=
  async visitors(req, res, next) {
    try {
      const dateFrom = req.query.from || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
      const dateTo   = req.query.to   || new Date().toISOString().split('T')[0];

      const { rows } = await query(
        `SELECT b.visit_date AS date,
                COUNT(DISTINCT b.id) AS bookings,
                COALESCE(SUM(bd.quantity),0) AS visitors
         FROM bookings b
         JOIN booking_details bd ON bd.booking_id=b.id
         WHERE b.visit_date BETWEEN $1 AND $2 AND b.status NOT IN ('cancelled','refunded')
         GROUP BY b.visit_date ORDER BY b.visit_date ASC`,
        [dateFrom, dateTo]
      );
      return success(res, { data: rows, dateFrom, dateTo });
    } catch (err) { next(err); }
  },

  // GET /api/reports/popular-attractions?limit=10
  async popularAttractions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit)||10;
      const { rows } = await query(
        `SELECT a.id, a.name, a.category, a.city, a.cover_image,
                COUNT(b.id) AS total_bookings,
                COALESCE(SUM(bd.quantity),0) AS total_visitors,
                COALESCE(SUM(b.total_amount),0) AS revenue,
                a.average_rating
         FROM attractions a
         LEFT JOIN bookings b ON b.attraction_id=a.id AND b.status NOT IN ('cancelled','refunded')
         LEFT JOIN booking_details bd ON bd.booking_id=b.id
         GROUP BY a.id ORDER BY total_bookings DESC LIMIT $1`,
        [limit]
      );
      return success(res, { data: rows });
    } catch (err) { next(err); }
  },

  // GET /api/reports/ticket-sales?from=&to=
  async ticketSales(req, res, next) {
    try {
      const dateFrom = req.query.from || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
      const dateTo   = req.query.to   || new Date().toISOString().split('T')[0];

      const { rows } = await query(
        `SELECT tt.name AS ticket_type,
                a.name AS attraction_name,
                COUNT(bd.id) AS transactions,
                SUM(bd.quantity) AS tickets_sold,
                SUM(bd.subtotal) AS revenue
         FROM booking_details bd
         JOIN ticket_types tt ON tt.id=bd.ticket_type_id
         JOIN attractions a ON a.id=tt.attraction_id
         JOIN bookings b ON b.id=bd.booking_id
         WHERE b.created_at::date BETWEEN $1 AND $2 AND b.status NOT IN ('cancelled','refunded')
         GROUP BY tt.name, a.name ORDER BY tickets_sold DESC`,
        [dateFrom, dateTo]
      );
      return success(res, { data: rows, dateFrom, dateTo });
    } catch (err) { next(err); }
  },
};

module.exports = reportController;
