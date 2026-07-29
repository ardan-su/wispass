const { query } = require('../config/database');

const AttractionModel = {
  async findAll({ limit, offset, search, category, city, isActive, isFeatured, sortBy }) {
    let sql = `
      SELECT a.*, 
             (SELECT COUNT(*) FROM ticket_types tt WHERE tt.attraction_id = a.id AND tt.is_active = TRUE) AS ticket_type_count,
             (SELECT MIN(tt.base_price) FROM ticket_types tt WHERE tt.attraction_id = a.id AND tt.is_active = TRUE) AS min_price,
             (SELECT MAX(tt.base_price) FROM ticket_types tt WHERE tt.attraction_id = a.id AND tt.is_active = TRUE) AS max_price,
             (SELECT ai.image_url FROM attraction_images ai WHERE ai.attraction_id = a.id ORDER BY ai.sort_order LIMIT 1) AS first_image
      FROM attractions a WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (a.name ILIKE $${params.length} OR a.city ILIKE $${params.length} OR a.description ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      sql += ` AND a.category = $${params.length}`;
    }
    if (city) {
      params.push(`%${city}%`);
      sql += ` AND a.city ILIKE $${params.length}`;
    }
    if (isActive !== undefined) {
      params.push(isActive);
      sql += ` AND a.is_active = $${params.length}`;
    }
    if (isFeatured !== undefined) {
      params.push(isFeatured);
      sql += ` AND a.is_featured = $${params.length}`;
    }

    // Build a separate count query using the same WHERE conditions
    let countSql = `SELECT COUNT(*) AS total FROM attractions a WHERE 1=1`;
    const countParams = [...params]; // same params accumulated so far
    if (search) countSql += ` AND (a.name ILIKE $${countParams.indexOf(`%${search}%`) + 1} OR a.city ILIKE $${countParams.indexOf(`%${search}%`) + 1} OR a.description ILIKE $${countParams.indexOf(`%${search}%`) + 1})`;

    // Simpler: re-build the count with its own param list
    const cParams = [];
    let cSql = `SELECT COUNT(*) AS total FROM attractions a WHERE 1=1`;
    if (search)    { cParams.push(`%${search}%`); cSql += ` AND (a.name ILIKE $${cParams.length} OR a.city ILIKE $${cParams.length} OR a.description ILIKE $${cParams.length})`; }
    if (category)  { cParams.push(category);  cSql += ` AND a.category = $${cParams.length}`; }
    if (city)      { cParams.push(`%${city}%`); cSql += ` AND a.city ILIKE $${cParams.length}`; }
    if (isActive !== undefined)  { cParams.push(isActive);  cSql += ` AND a.is_active = $${cParams.length}`; }
    if (isFeatured !== undefined){ cParams.push(isFeatured); cSql += ` AND a.is_featured = $${cParams.length}`; }
    const { rows: countRows } = await query(cSql, cParams);
    const total = parseInt(countRows[0].total);

    const orderMap = {
      newest:        'a.created_at DESC',
      popular:       'a.total_visitors DESC',
      lowest_price:  'min_price ASC NULLS LAST',
      highest_price: 'max_price DESC NULLS LAST',
      rating:        'a.average_rating DESC',
    };
    sql += ` ORDER BY ${orderMap[sortBy] || 'a.created_at DESC'}`;
    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    return { rows, total };
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT a.*,
              (SELECT MIN(tt.base_price) FROM ticket_types tt WHERE tt.attraction_id = a.id AND tt.is_active=TRUE) AS min_price
       FROM attractions a WHERE a.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const { rows } = await query(
      `SELECT a.*,
              (SELECT MIN(tt.base_price) FROM ticket_types tt WHERE tt.attraction_id=a.id AND tt.is_active=TRUE) AS min_price
       FROM attractions a WHERE a.slug = $1`,
      [slug]
    );
    return rows[0] || null;
  },

  async create({ id, name, slug, category, description, facilities, location, city, province,
                 mapsLink, latitude, longitude, openTime, closeTime, openDays, coverImage, isFeatured }) {
    const { rows } = await query(
      `INSERT INTO attractions
         (id,name,slug,category,description,facilities,location,city,province,
          maps_link,latitude,longitude,open_time,close_time,open_days,cover_image,is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [id,name,slug,category,description,
       JSON.stringify(facilities||[]),
       location,city,province,mapsLink,latitude,longitude,
       openTime,closeTime,
       JSON.stringify(openDays||['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
       coverImage,isFeatured||false]
    );
    return rows[0];
  },

  async update(id, fields) {
    const sets = [], params = [];
    const allowed = ['name','slug','category','description','facilities','location','city','province',
                     'maps_link','latitude','longitude','open_time','close_time','open_days',
                     'cover_image','is_featured','is_active'];
    for (const [k,v] of Object.entries(fields)) {
      const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col)) {
        params.push((['facilities','open_days'].includes(col)) ? JSON.stringify(v) : v);
        sets.push(`${col}=$${params.length}`);
      }
    }
    if (!sets.length) return null;
    params.push(id);
    const { rows } = await query(
      `UPDATE attractions SET ${sets.join(',')},updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    return rows[0];
  },

  async delete(id) {
    await query(`DELETE FROM attractions WHERE id=$1`, [id]);
  },

  async getImages(attractionId) {
    const { rows } = await query(
      `SELECT * FROM attraction_images WHERE attraction_id=$1 ORDER BY sort_order`,
      [attractionId]
    );
    return rows;
  },

  async addImage({ id, attractionId, imageUrl, caption, sortOrder }) {
    const { rows } = await query(
      `INSERT INTO attraction_images (id,attraction_id,image_url,caption,sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, attractionId, imageUrl, caption||null, sortOrder||0]
    );
    return rows[0];
  },

  async deleteImage(imageId) {
    await query(`DELETE FROM attraction_images WHERE id=$1`, [imageId]);
  },

  async updateStats(id) {
    await query(
      `UPDATE attractions a SET
         total_reviews  = (SELECT COUNT(*) FROM reviews  r WHERE r.attraction_id=a.id),
         average_rating = COALESCE((SELECT AVG(rating) FROM reviews r WHERE r.attraction_id=a.id),0),
         total_visitors = (SELECT COALESCE(SUM(bd.quantity),0)
                           FROM bookings b
                           JOIN booking_details bd ON bd.booking_id=b.id
                           WHERE b.attraction_id=a.id AND b.status IN ('confirmed','completed'))
       WHERE a.id=$1`,
      [id]
    );
  },

  async getCategories() {
    const { rows } = await query(
      `SELECT DISTINCT category, COUNT(*) AS count
       FROM attractions WHERE is_active=TRUE GROUP BY category ORDER BY count DESC`
    );
    return rows;
  },

  async getCities() {
    const { rows } = await query(
      `SELECT DISTINCT city, province, COUNT(*) AS count
       FROM attractions WHERE is_active=TRUE GROUP BY city,province ORDER BY count DESC`
    );
    return rows;
  },
};

module.exports = AttractionModel;
