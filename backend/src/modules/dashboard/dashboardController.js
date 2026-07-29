/**
 * Dashboard Controller – MariaDB edition
 * Adds QR stats: todayScans, activeQR, expiredQR, visitorsToday, recentScanActivity
 */
const { query }  = require('../../config/database');
const { success } = require('../../utils/helpers');

const dashboardController = {
  // GET /api/dashboard/admin
  async admin(req, res, next) {
    try {
      const today      = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';

      const [
        totalSites, totalCustomers, totalOrders,
        todayOrders, revenueToday, revenueMonth,
        ordersByStatus, recentOrders, topSites,
        dailyRevenue,
        // QR stats
        todayScans, activeQR, expiredQR, visitorsToday,
        recentScans,
      ] = await Promise.all([
        query(`SELECT COUNT(*) AS count FROM tourist_sites WHERE is_active=1 AND deleted_at IS NULL`),
        query(`SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='customer' AND u.deleted_at IS NULL`),
        query(`SELECT COUNT(*) AS count FROM ticket_orders WHERE deleted_at IS NULL`),
        query(`SELECT COUNT(*) AS count FROM ticket_orders WHERE DATE(created_at)=?`, [today]),
        query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM ticket_orders WHERE DATE(created_at)=? AND payment_status='paid'`, [today]),
        query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM ticket_orders WHERE created_at>=? AND payment_status='paid'`, [monthStart]),
        query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total FROM ticket_orders WHERE deleted_at IS NULL GROUP BY status`),
        query(`SELECT o.id, o.booking_code, o.total_amount, o.status, o.created_at,
                      u.full_name AS customer_name, ts.name AS attraction_name
               FROM ticket_orders o
               JOIN users u ON u.id=o.user_id
               JOIN tourist_sites ts ON ts.id=o.site_id
               WHERE o.deleted_at IS NULL
               ORDER BY o.created_at DESC LIMIT 10`),
        query(`SELECT ts.id, ts.name, ts.cover_image, ts.category, ts.city,
                      COUNT(o.id) AS booking_count,
                      COALESCE(SUM(o.total_amount),0) AS revenue
               FROM tourist_sites ts
               LEFT JOIN ticket_orders o ON o.site_id=ts.id AND o.payment_status='paid' AND o.deleted_at IS NULL
               WHERE ts.deleted_at IS NULL
               GROUP BY ts.id, ts.name, ts.cover_image, ts.category, ts.city
               ORDER BY booking_count DESC LIMIT 5`),
        query(`SELECT DATE(created_at) AS date,
                      COALESCE(SUM(total_amount),0) AS revenue,
                      COUNT(*) AS bookings
               FROM ticket_orders
               WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND payment_status='paid' AND deleted_at IS NULL
               GROUP BY DATE(created_at) ORDER BY date ASC`),
        // QR
        query(`SELECT COUNT(*) AS count FROM qr_scan_logs WHERE DATE(scan_time)=?`, [today]),
        query(`SELECT COUNT(*) AS count FROM qr_codes WHERE status='active' AND deleted_at IS NULL`),
        query(`SELECT COUNT(*) AS count FROM qr_codes WHERE status='expired' AND deleted_at IS NULL`),
        query(`SELECT COUNT(*) AS count FROM visitor_logs WHERE visit_date=?`, [today]),
        query(`SELECT qsl.result, qsl.visitor_name, qsl.ticket_type, qsl.scan_time,
                      u.full_name AS scanner_name, ts.name AS site_name, qc.uuid AS qr_uuid
               FROM qr_scan_logs qsl
               JOIN qr_codes qc ON qc.id=qsl.qr_id
               LEFT JOIN users u ON u.id=qsl.scanned_by
               LEFT JOIN tourist_sites ts ON ts.id=qc.site_id
               ORDER BY qsl.scan_time DESC LIMIT 10`),
      ]);

      const statusMap = {};
      ordersByStatus.forEach(r => {
        statusMap[r.status] = { count: parseInt(r.count), total: parseFloat(r.total) };
      });

      return success(res, {
        stats: {
          totalAttractions: parseInt(totalSites[0].count),
          totalCustomers:   parseInt(totalCustomers[0].count),
          totalBookings:    parseInt(totalOrders[0].count),
          todayBookings:    parseInt(todayOrders[0].count),
          revenueToday:     parseFloat(revenueToday[0].total),
          revenueMonth:     parseFloat(revenueMonth[0].total),
          pending:    statusMap.pending    || { count: 0, total: 0 },
          confirmed:  statusMap.confirmed  || { count: 0, total: 0 },
          completed:  statusMap.completed  || { count: 0, total: 0 },
          cancelled:  statusMap.cancelled  || { count: 0, total: 0 },
          // QR / Gate stats
          todayScans:   parseInt(todayScans[0].count),
          activeQR:     parseInt(activeQR[0].count),
          expiredQR:    parseInt(expiredQR[0].count),
          visitorsToday: parseInt(visitorsToday[0].count),
        },
        recentBookings:       recentOrders,
        topAttractions:       topSites,
        dailyRevenue,
        recentScanActivity:   recentScans,
      });
    } catch (err) { next(err); }
  },

  // GET /api/dashboard/customer
  async customer(req, res, next) {
    try {
      const userId = req.user.id;
      const today  = new Date().toISOString().split('T')[0];

      const [upcomingTickets, recentOrders, totalSpend, unreadNotif] = await Promise.all([
        query(`SELECT t.id, t.ticket_code, t.visit_date, t.status, t.qr_code,
                      ts.name AS attraction_name, ts.city, ts.cover_image,
                      tt.name AS ticket_type_name
               FROM tickets t
               JOIN tourist_sites ts ON ts.id=t.site_id
               JOIN ticket_types tt  ON tt.id=t.ticket_type_id
               WHERE t.user_id=? AND t.visit_date>=? AND t.status='active'
               ORDER BY t.visit_date ASC LIMIT 5`, [userId, today]),
        query(`SELECT o.id, o.booking_code, o.total_amount, o.status, o.visit_date, o.created_at,
                      ts.name AS attraction_name, ts.cover_image, ts.city
               FROM ticket_orders o
               JOIN tourist_sites ts ON ts.id=o.site_id
               WHERE o.user_id=? AND o.deleted_at IS NULL
               ORDER BY o.created_at DESC LIMIT 5`, [userId]),
        query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM ticket_orders WHERE user_id=? AND payment_status='paid'`, [userId]),
        query(`SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0`, [userId]),
      ]);

      return success(res, {
        upcomingTickets,
        recentBookings:       recentOrders,
        totalSpend:           parseFloat(totalSpend[0].total),
        unreadNotifications:  parseInt(unreadNotif[0].count),
      });
    } catch (err) { next(err); }
  },
};

module.exports = dashboardController;
