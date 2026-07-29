const { v4: uuidv4 }  = require('uuid');
const PromotionModel  = require('../models/PromotionModel');
const { success, error, getPagination, paginate } = require('../utils/helpers');

const promotionController = {
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, isActive } = req.query;
      const active = isActive !== undefined ? isActive === 'true' : undefined;
      const { rows, total } = await PromotionModel.findAll({ limit, offset, search, isActive: active });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  async detail(req, res, next) {
    try {
      const promo = await PromotionModel.findById(req.params.id);
      if (!promo) return error(res, 'Promotion not found.', 404);
      return success(res, { promotion: promo });
    } catch (err) { next(err); }
  },

  // POST /api/promotions/validate  (customer – check code before booking)
  async validateCode(req, res, next) {
    try {
      const { code, subtotal } = req.body;
      const promo = await PromotionModel.findByCode(code);
      if (!promo) return error(res, 'Promo code not found.', 404);
      const result = PromotionModel.validate(promo, parseFloat(subtotal)||0);
      if (!result.valid) return error(res, result.reason, 400);
      return success(res, {
        promotion: { id: promo.id, code: promo.code, name: promo.name,
                     discountType: promo.discount_type, discountValue: promo.discount_value,
                     discount: result.discount }
      }, 'Promo code is valid.');
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { code, name, description, discountType, discountValue, minPurchase,
              maxDiscount, usageLimit, validFrom, validUntil } = req.body;
      const existing = await PromotionModel.findByCode(code);
      if (existing) return error(res, 'Promo code already exists.', 409);
      const promo = await PromotionModel.create({
        id: uuidv4(), code, name, description, discountType, discountValue,
        minPurchase, maxDiscount, usageLimit, validFrom, validUntil,
      });
      return success(res, { promotion: promo }, 'Promotion created.', 201);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const promo = await PromotionModel.findById(req.params.id);
      if (!promo) return error(res, 'Promotion not found.', 404);
      const updated = await PromotionModel.update(req.params.id, req.body);
      return success(res, { promotion: updated }, 'Promotion updated.');
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await PromotionModel.delete(req.params.id);
      return success(res, {}, 'Promotion deleted.');
    } catch (err) { next(err); }
  },
};

module.exports = promotionController;
