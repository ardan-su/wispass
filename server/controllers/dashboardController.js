const { query }  = require('../config/database');
const { success } = require('../utils/helpers');

const dashboardController = {
  // GET /api/dashboard/admin
  async admin(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';

      const [
        totalAttractions, totalCustomers, totalBookings,
        todayBookings, revenueToday, revenueMonth,
        bookingsByStatus, recentBookings, topAttractions,
        dailyRevenue,
      ] = await Promise.all([
        query(`SELECT COUNT(*) AS count FROM attractions WHERE is_active=TRUE`),
        query(`SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='customer'`),
        query(`SELECT COUNT(*) AS count FROM bookings`),
        query(`SELECT COUNT(*) AS count FROM bookings WHERE DATE(created_at)=$1`, [today]),
        query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM bookings WHERE DATE(created_at)=$1 AND payment_status='paid'`, [today]),
        query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM bookings WHERE created_at>=$1 AND payment_status='paid'`, [monthStart]),
        query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total FROM bookings GROUP BY status`),
        query(`SELECT b.id, b.booking_code, b.total_amount, b.status, b.created_at,
                      u.full_name AS customer_name, a.name AS attraction_name
               FROM bookings b JOIN users u ON u.id=b.user_id JOIN attractions a ON a.id=b.attraction_id
               ORDER BY b.created_at DESC LIMIT 10`),
        query(`SELECT a.id, a.name, a.cover_image, a.category, a.city,
                      COUNT(b.id) AS booking_count,
                      COALESCE(SUM(b.total_amount),0) AS revenue
               FROM attractions a
               LEFT JOIN bookings b ON b.attraction_id=a.id AND b.payment_status='paid'
               GROUP BY a.id ORDER BY booking_count DESC LIMIT 5`),
        query(`SELECT DATE(created_at) AS date,
                      COALESCE(SUM(total_amount),0) AS revenue,
                      COUNT(*) AS bookings
               FROM bookings
               WHERE created_at >= NOW() - INTERVAL '30 days' AND payment_status='paid'
               GROUP BY DATE(created_at) ORDER BY date ASC`),
      ]);

      const statusMap = {};
      bookingsByStatus.rows.forEach(r => { statusMap[r.status] = { count: parseInt(r.count), total: parseFloat(r.total) }; });

      return success(res, {
        stats: {
          totalAttractions: parseInt(totalAttractions.rows[0].count),
          totalCustomers:   parseInt(totalCustomers.rows[0].count),
          totalBookings:    parseInt(totalBookings.rows[0].count),
          todayBookings:    parseInt(todayBookings.rows[0].count),
          revenueToday:     parseFloat(revenueToday.rows[0].total),
          revenueMonth:     parseFloat(revenueMonth.rows[0].total),
          pending:          statusMap.pending   || { count: 0, total: 0 },
          confirmed:        statusMap.confirmed || { count: 0, total: 0 },
          completed:        statusMap.completed || { count: 0, total: 0 },
          cancelled:        statusMap.cancelled || { count: 0, total: 0 },
        },
        recentBookings:  recentBookings.rows,
        topAttractions:  topAttractions.rows,
        dailyRevenue:    dailyRevenue.rows,
      });
    } catch (err) { next(err); }
  },

  // GET /api/dashboard/customer
  async customer(req, res, next) {
    try {
      const userId = req.user.id;
      const today  = new Date().toISOString().split('T')[0];

      const [upcomingTickets, recentBookings, totalSpend, unreadNotif] = await Promise.all([
        query(`SELECT t.id, t.ticket_code, t.visit_date, t.status, t.qr_code,
                      a.name AS attraction_name, a.city, a.cover_image,
                      tt.name AS ticket_type_name
               FROM tickets t
               JOIN attractions a ON a.id=t.attraction_id
               JOIN ticket_types tt ON tt.id=t.ticket_type_id
               WHERE t.user_id=$1 AND t.visit_date>=$2 AND t.status='active'
               ORDER BY t.visit_date ASC LIMIT 5`, [userId, today]),
        query(`SELECT b.id, b.booking_code, b.total_amount, b.status, b.visit_date, b.created_at,
                      a.name AS attraction_name, a.cover_image, a.city
               FROM bookings b JOIN attractions a ON a.id=b.attraction_id
               WHERE b.user_id=$1 ORDER BY b.created_at DESC LIMIT 5`, [userId]),
        query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM bookings WHERE user_id=$1 AND payment_status='paid'`, [userId]),
        query(`SELECT COUNT(*) AS count FROM notifications WHERE user_id=$1 AND is_read=FALSE`, [userId]),
      ]);

      return success(res, {
        upcomingTickets:   upcomingTickets.rows,
        recentBookings:    recentBookings.rows,
        totalSpend:        parseFloat(totalSpend.rows[0].total),
        unreadNotifications: parseInt(unreadNotif.rows[0].count),
      });
    } catch (err) { next(err); }
  },
};

module.exports = dashboardController;
