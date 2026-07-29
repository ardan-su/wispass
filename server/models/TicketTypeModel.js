const { query } = require('../config/database');

const TicketTypeModel = {
  async findByAttraction(attractionId, onlyActive = false) {
    let sql = `SELECT * FROM ticket_types WHERE attraction_id=$1`;
    if (onlyActive) sql += ` AND is_active=TRUE`;
    sql += ` ORDER BY base_price ASC`;
    const { rows } = await query(sql, [attractionId]);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM ticket_types WHERE id=$1`, [id]);
    return rows[0]||null;
  },

  async create({ id, attractionId, name, description, basePrice, weekendPrice,
                 holidayPrice, dailyQuota, minPurchase, maxPurchase }) {
    const { rows } = await query(
      `INSERT INTO ticket_types
         (id,attraction_id,name,description,base_price,weekend_price,
          holiday_price,daily_quota,min_purchase,max_purchase)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id,attractionId,name,description||null,basePrice,
       weekendPrice||null,holidayPrice||null,dailyQuota||100,
       minPurchase||1,maxPurchase||10]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name','description','base_price','weekend_price','holiday_price',
                     'daily_quota','min_purchase','max_purchase','is_active'];
    const sets = [], params = [];
    for (const [k,v] of Object.entries(fields)) {
      const col = k.replace(/([A-Z])/g,'_$1').toLowerCase();
      if (allowed.includes(col)) { params.push(v); sets.push(`${col}=$${params.length}`); }
    }
    if (!sets.length) return null;
    params.push(id);
    const { rows } = await query(
      `UPDATE ticket_types SET ${sets.join(',')},updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    return rows[0];
  },

  async delete(id) {
    await query(`DELETE FROM ticket_types WHERE id=$1`, [id]);
  },

  /** Check how many tickets have been booked for a given type + date */
  async getBookedCount(ticketTypeId, visitDate) {
    const { rows } = await query(
      `SELECT COALESCE(SUM(bd.quantity),0) AS booked
       FROM booking_details bd
       JOIN bookings b ON b.id=bd.booking_id
       WHERE bd.ticket_type_id=$1
         AND b.visit_date=$2
         AND b.status NOT IN ('cancelled','refunded')`,
      [ticketTypeId, visitDate]
    );
    return parseInt(rows[0].booked);
  },
};

module.exports = TicketTypeModel;
