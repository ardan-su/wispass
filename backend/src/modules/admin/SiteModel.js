/**
 * Tourist Site Model (formerly Attraction) – MariaDB edition
 * Table: tourist_sites (was: attractions)
 * All $N → ? placeholders, ILIKE → LIKE, RETURNING * removed, JSONB → JSON
 */
const { query } = require('../../config/database');

const SiteModel = {
  async findAll({ limit, offset, search, category, city, isActive, isFeatured, sortBy } = {}) {
    let sql = `
      SELECT ts.*,
             (SELECT COUNT(*) FROM ticket_types tt WHERE tt.site_id = ts.id AND tt.is_active = 1) AS ticket_type_count,
             (SELECT MIN(tt.base_price) FROM ticket_types tt WHERE tt.site_id = ts.id AND tt.is_active = 1) AS min_price,
             (SELECT MAX(tt.base_price) FROM ticket_types tt WHERE tt.site_id = ts.id AND tt.is_active = 1) AS max_price,
             (SELECT ai.image_url FROM attraction_images ai WHERE ai.site_id = ts.id ORDER BY ai.sort_order LIMIT 1) AS first_image
      FROM tourist_sites ts WHERE ts.deleted_at IS NULL`;
    const params  = [];
    let cSql      = `SELECT COUNT(*) AS total FROM tourist_sites ts WHERE ts.deleted_at IS NULL`;
    const cParams = [];

    function addCond(clause, ...vals) {
      sql   += clause; params.push(...vals);
      cSql  += clause; cParams.push(...vals);
    }

    if (search) {
      const like = `%${search}%`;
      addCond(` AND (ts.name LIKE ? OR ts.city LIKE ? OR ts.description LIKE ?)`, like, like, like);
    }
    if (category) addCond(` AND ts.category = ?`, category);
    if (city)     addCond(` AND ts.city LIKE ?`, `%${city}%`);
    if (isActive  !== undefined) addCond(` AND ts.is_active = ?`, isActive ? 1 : 0);
    if (isFeatured !== undefined) addCond(` AND ts.is_featured = ?`, isFeatured ? 1 : 0);

    const countRows = await query(cSql, cParams);
    const total     = parseInt(countRows[0].total);

    const orderMap = {
      newest:        'ts.created_at DESC',
      popular:       'ts.total_visitors DESC',
      lowest_price:  'min_price ASC',
      highest_price: 'max_price DESC',
      rating:        'ts.average_rating DESC',
    };
    sql += ` ORDER BY ${orderMap[sortBy] || 'ts.created_at DESC'}`;
    params.push(limit || 10, offset || 0);
    sql += ` LIMIT ? OFFSET ?`;

    const rows = await query(sql, params);
    return { rows, total };
  },

  async findById(id) {
    const rows = await query(
      `SELECT ts.*,
              (SELECT MIN(tt.base_price) FROM ticket_types tt WHERE tt.site_id = ts.id AND tt.is_active=1) AS min_price
       FROM tourist_sites ts WHERE ts.id = ? AND ts.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const rows = await query(
      `SELECT ts.*,
              (SELECT MIN(tt.base_price) FROM ticket_types tt WHERE tt.site_id=ts.id AND tt.is_active=1) AS min_price
       FROM tourist_sites ts WHERE ts.slug = ? AND ts.deleted_at IS NULL`,
      [slug]
    );
    return rows[0] || null;
  },

  async create({ id, name, slug, category, description, facilities, location, city, province,
                 mapsLink, latitude, longitude, openTime, closeTime, openDays, coverImage, isFeatured }) {
    await query(
      `INSERT INTO tourist_sites
         (id,name,slug,category,description,facilities,location,city,province,
          maps_link,latitude,longitude,open_time,close_time,open_days,cover_image,is_featured)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, name, slug, category, description,
       JSON.stringify(facilities || []),
       location, city, province, mapsLink, latitude, longitude,
       openTime, closeTime,
       JSON.stringify(openDays || ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
       coverImage, isFeatured ? 1 : 0]
    );
    return this.findById(id);
  },

  async update(id, fields) {
    const sets   = [];
    const params = [];
    const allowed = ['name','slug','category','description','facilities','location','city','province',
                     'maps_link','latitude','longitude','open_time','close_time','open_days',
                     'cover_image','is_featured','is_active'];
    for (const [k, v] of Object.entries(fields)) {
      const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col)) {
        params.push(['facilities','open_days'].includes(col) ? JSON.stringify(v) : v);
        sets.push(`${col} = ?`);
      }
    }
    if (!sets.length) return null;
    params.push(id);
    await query(`UPDATE tourist_sites SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
    return this.findById(id);
  },

  async softDelete(id) {
    await query(`UPDATE tourist_sites SET deleted_at = NOW() WHERE id = ?`, [id]);
  },

  async getImages(siteId) {
    return query(`SELECT * FROM attraction_images WHERE site_id = ? ORDER BY sort_order`, [siteId]);
  },

  async addImage({ id, siteId, imageUrl, caption, sortOrder }) {
    await query(
      `INSERT INTO attraction_images (id, site_id, image_url, caption, sort_order)
       VALUES (?,?,?,?,?)`,
      [id, siteId, imageUrl, caption || null, sortOrder || 0]
    );
    const rows = await query(`SELECT * FROM attraction_images WHERE id = ?`, [id]);
    return rows[0];
  },

  async deleteImage(imageId) {
    await query(`DELETE FROM attraction_images WHERE id = ?`, [imageId]);
  },

  async updateStats(id) {
    await query(
      `UPDATE tourist_sites ts SET
         total_reviews  = (SELECT COUNT(*) FROM reviews r WHERE r.site_id = ts.id),
         average_rating = COALESCE((SELECT AVG(rating) FROM reviews r WHERE r.site_id = ts.id), 0),
         total_visitors = (SELECT COALESCE(SUM(od.quantity), 0)
                           FROM ticket_orders o
                           JOIN order_details od ON od.order_id = o.id
                           WHERE o.site_id = ts.id AND o.status IN ('confirmed','completed'))
       WHERE ts.id = ?`,
      [id]
    );
  },

  async getCategories() {
    return query(
      `SELECT category, COUNT(*) AS count FROM tourist_sites
       WHERE is_active=1 AND deleted_at IS NULL GROUP BY category ORDER BY count DESC`
    );
  },

  async getCities() {
    return query(
      `SELECT city, province, COUNT(*) AS count FROM tourist_sites
       WHERE is_active=1 AND deleted_at IS NULL GROUP BY city, province ORDER BY count DESC`
    );
  },
};

module.exports = SiteModel;
