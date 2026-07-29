const { query } = require('../config/database');

const PromotionModel = {
  async findAll({ limit, offset, search, isActive }) {
    let sql = `SELECT * FROM promotions WHERE 1=1`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (code ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }
    if (isActive !== undefined) { params.push(isActive); sql += ` AND is_active=$${params.length}`; }

    const cParams2 = [];
    let cSql2 = `SELECT COUNT(*) AS total FROM promotions WHERE 1=1`;
    if (search)    { cParams2.push(`%${search}%`); cSql2 += ` AND (code ILIKE $${cParams2.length} OR name ILIKE $${cParams2.length})`; }
    if (isActive !== undefined) { cParams2.push(isActive); cSql2 += ` AND is_active=$${cParams2.length}`; }
    const { rows: cr } = await query(cSql2, cParams2);
    const total = parseInt(cr[0].total);

    params.push(limit, offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const { rows } = await query(sql, params);
    return { rows, total };
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM promotions WHERE id=$1`,[id]);
    return rows[0]||null;
  },

  async findByCode(code) {
    const { rows } = await query(`SELECT * FROM promotions WHERE UPPER(code)=UPPER($1)`,[code]);
    return rows[0]||null;
  },

  async create({ id, code, name, description, discountType, discountValue, minPurchase,
                 maxDiscount, usageLimit, validFrom, validUntil }) {
    const { rows } = await query(
      `INSERT INTO promotions
         (id,code,name,description,discount_type,discount_value,min_purchase,
          max_discount,usage_limit,valid_from,valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id,code.toUpperCase(),name,description||null,discountType,discountValue,
       minPurchase||0,maxDiscount||null,usageLimit||null,validFrom,validUntil]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name','description','discount_type','discount_value','min_purchase',
                     'max_discount','usage_limit','valid_from','valid_until','is_active'];
    const sets = [], params = [];
    for (const [k,v] of Object.entries(fields)) {
      const col = k.replace(/([A-Z])/g,'_$1').toLowerCase();
      if (allowed.includes(col)) { params.push(v); sets.push(`${col}=$${params.length}`); }
    }
    if (!sets.length) return null;
    params.push(id);
    const { rows } = await query(
      `UPDATE promotions SET ${sets.join(',')},updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    return rows[0];
  },

  async delete(id) { await query(`DELETE FROM promotions WHERE id=$1`,[id]); },

  async incrementUsage(id) {
    await query(`UPDATE promotions SET used_count=used_count+1 WHERE id=$1`,[id]);
  },

  /** Validate a promo code and calculate discount amount */
  validate(promo, subtotal) {
    const now = new Date();
    if (!promo.is_active) return { valid: false, reason: 'Voucher is not active.' };
    if (new Date(promo.valid_from) > now) return { valid: false, reason: 'Voucher not yet valid.' };
    if (new Date(promo.valid_until) < now) return { valid: false, reason: 'Voucher has expired.' };
    if (promo.usage_limit && promo.used_count >= promo.usage_limit)
      return { valid: false, reason: 'Voucher usage limit reached.' };
    if (subtotal < parseFloat(promo.min_purchase))
      return { valid: false, reason: `Minimum purchase Rp${promo.min_purchase} required.` };

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = subtotal * (parseFloat(promo.discount_value) / 100);
      if (promo.max_discount) discount = Math.min(discount, parseFloat(promo.max_discount));
    } else {
      discount = parseFloat(promo.discount_value);
    }
    discount = Math.min(discount, subtotal);
    return { valid: true, discount: Math.round(discount) };
  },
};

module.exports = PromotionModel;
