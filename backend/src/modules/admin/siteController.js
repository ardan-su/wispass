/**
 * Admin Site Controller – MariaDB (formerly attractionController)
 */
const { v4: uuid } = require('uuid');
const SiteModel    = require('./SiteModel');
const { query }    = require('../../config/database');
const { success, error, getPagination, paginate, slugify } = require('../../utils/helpers');

const siteController = {
  // GET /api/attractions
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, category, city, featured, sortBy } = req.query;
      const isFeatured = featured === 'true' ? true : undefined;
      const { rows, total } = await SiteModel.findAll({ limit, offset, search, category, city, isActive: true, isFeatured, sortBy });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/attractions/admin
  async adminList(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, category, city, isActive, sortBy } = req.query;
      const active = isActive !== undefined ? isActive === 'true' : undefined;
      const { rows, total } = await SiteModel.findAll({ limit, offset, search, category, city, isActive: active, sortBy });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/attractions/categories
  async categories(req, res, next) {
    try {
      const rows = await SiteModel.getCategories();
      return success(res, { categories: rows });
    } catch (err) { next(err); }
  },

  // GET /api/attractions/cities
  async cities(req, res, next) {
    try {
      const rows = await SiteModel.getCities();
      return success(res, { cities: rows });
    } catch (err) { next(err); }
  },

  // GET /api/attractions/:idOrSlug
  async detail(req, res, next) {
    try {
      const { idOrSlug } = req.params;
      let site = await SiteModel.findById(idOrSlug);
      if (!site) site = await SiteModel.findBySlug(idOrSlug);
      if (!site) return error(res, 'Attraction not found.', 404);

      const ticketTypes = await query(
        `SELECT * FROM ticket_types WHERE site_id = ? AND is_active = 1 ORDER BY base_price ASC`, [site.id]
      );
      const images = await SiteModel.getImages(site.id);
      const reviews = await query(
        `SELECT r.*, u.full_name AS user_name, u.avatar AS user_avatar
         FROM reviews r JOIN users u ON u.id = r.user_id
         WHERE r.site_id = ? AND r.is_visible = 1 ORDER BY r.created_at DESC LIMIT 5`, [site.id]
      );

      return success(res, { attraction: site, ticketTypes, images, reviews });
    } catch (err) { next(err); }
  },

  // POST /api/attractions
  async create(req, res, next) {
    try {
      const { name, category, description, location, city, province, isFeatured } = req.body;
      const mapsLink   = req.body.mapsLink   || req.body.maps_link  || null;
      const latitude   = req.body.latitude   != null ? req.body.latitude   : null;
      const longitude  = req.body.longitude  != null ? req.body.longitude  : null;
      const openTime   = req.body.openTime   || req.body.open_time  || null;
      const closeTime  = req.body.closeTime  || req.body.close_time || null;
      const openDays   = req.body.openDays   || req.body.open_days  || null;
      // facilitiesRaw is comma-separated from the form
      const facilitiesRaw = req.body.facilitiesRaw || req.body.facilities || '';
      const facilities = Array.isArray(facilitiesRaw)
        ? facilitiesRaw
        : (typeof facilitiesRaw === 'string' && facilitiesRaw
          ? facilitiesRaw.split(',').map(s => s.trim()).filter(Boolean)
          : []);
      const id   = uuid();
      const slug = slugify(name) + '-' + id.substring(0, 8);
      const coverImage = req.file ? `/uploads/attractions/${req.file.filename}` : null;

      const site = await SiteModel.create({
        id, name, slug, category, description,
        facilities,
        location, city, province, mapsLink, latitude, longitude, openTime, closeTime,
        openDays: Array.isArray(openDays) ? openDays : (openDays ? JSON.parse(openDays) : null),
        coverImage, isFeatured: isFeatured === 'true' || isFeatured === true,
      });

      return success(res, { attraction: site }, 'Attraction created successfully.', 201);
    } catch (err) { next(err); }
  },

  // PUT /api/attractions/:id
  async update(req, res, next) {
    try {
      const existing = await SiteModel.findById(req.params.id);
      if (!existing) return error(res, 'Attraction not found.', 404);
      const fields = { ...req.body };
      if (req.file) fields.cover_image = `/uploads/attractions/${req.file.filename}`;
      if (fields.facilities && typeof fields.facilities === 'string') fields.facilities = JSON.parse(fields.facilities);
      if (fields.openDays && typeof fields.openDays === 'string') fields.open_days = JSON.parse(fields.openDays);
      // Normalize camelCase to snake_case
      if (fields.mapsLink   !== undefined) { fields.maps_link  = fields.mapsLink;   delete fields.mapsLink; }
      if (fields.openTime   !== undefined) { fields.open_time  = fields.openTime;   delete fields.openTime; }
      if (fields.closeTime  !== undefined) { fields.close_time = fields.closeTime;  delete fields.closeTime; }
      if (fields.isFeatured !== undefined) { fields.is_featured = fields.isFeatured === 'true' || fields.isFeatured === true ? 1 : 0; delete fields.isFeatured; }
      if (fields.isActive   !== undefined) { fields.is_active   = fields.isActive   === 'true' || fields.isActive   === true ? 1 : 0; delete fields.isActive; }
      if (fields.facilitiesRaw !== undefined) {
        fields.facilities = fields.facilitiesRaw.split(',').map(s => s.trim()).filter(Boolean);
        delete fields.facilitiesRaw;
      }
      const site = await SiteModel.update(req.params.id, fields);
      return success(res, { attraction: site }, 'Attraction updated successfully.');
    } catch (err) { next(err); }
  },

  // DELETE /api/attractions/:id (soft delete)
  async remove(req, res, next) {
    try {
      const existing = await SiteModel.findById(req.params.id);
      if (!existing) return error(res, 'Attraction not found.', 404);
      await SiteModel.softDelete(req.params.id);
      return success(res, {}, 'Attraction deleted successfully.');
    } catch (err) { next(err); }
  },

  // POST /api/attractions/:id/images
  async addImage(req, res, next) {
    try {
      if (!req.file) return error(res, 'No image file provided.', 400);
      const image = await SiteModel.addImage({
        id: uuid(), siteId: req.params.id,
        imageUrl: `/uploads/attractions/${req.file.filename}`,
        caption: req.body.caption, sortOrder: req.body.sortOrder || 0,
      });
      return success(res, { image }, 'Image added.', 201);
    } catch (err) { next(err); }
  },

  // DELETE /api/attractions/images/:imageId
  async removeImage(req, res, next) {
    try {
      await SiteModel.deleteImage(req.params.imageId);
      return success(res, {}, 'Image removed.');
    } catch (err) { next(err); }
  },
};

module.exports = siteController;
