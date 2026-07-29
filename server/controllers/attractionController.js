const { v4: uuidv4 }  = require('uuid');
const AttractionModel = require('../models/AttractionModel');
const TicketTypeModel = require('../models/TicketTypeModel');
const ReviewModel     = require('../models/ReviewModel');
const { success, error, getPagination, paginate, slugify } = require('../utils/helpers');
const path = require('path');
const fs   = require('fs');

const attractionController = {
  // GET /api/attractions
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, category, city, featured, sortBy } = req.query;

      const isActive   = true;
      const isFeatured = featured === 'true' ? true : undefined;

      const { rows, total } = await AttractionModel.findAll({
        limit, offset, search, category, city, isActive, isFeatured, sortBy,
      });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/attractions/admin  (admin – includes inactive)
  async adminList(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, category, city, isActive, sortBy } = req.query;
      const active = isActive !== undefined ? isActive === 'true' : undefined;
      const { rows, total } = await AttractionModel.findAll({ limit, offset, search, category, city, isActive: active, sortBy });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/attractions/categories
  async categories(req, res, next) {
    try {
      const rows = await AttractionModel.getCategories();
      return success(res, { categories: rows });
    } catch (err) { next(err); }
  },

  // GET /api/attractions/cities
  async cities(req, res, next) {
    try {
      const rows = await AttractionModel.getCities();
      return success(res, { cities: rows });
    } catch (err) { next(err); }
  },

  // GET /api/attractions/:idOrSlug
  async detail(req, res, next) {
    try {
      const { idOrSlug } = req.params;
      let attraction = await AttractionModel.findById(idOrSlug);
      if (!attraction) attraction = await AttractionModel.findBySlug(idOrSlug);
      if (!attraction) return error(res, 'Attraction not found.', 404);

      const [ticketTypes, images, { rows: reviews }] = await Promise.all([
        TicketTypeModel.findByAttraction(attraction.id, true),
        AttractionModel.getImages(attraction.id),
        ReviewModel.findByAttraction(attraction.id, { limit: 5 }),
      ]);

      return success(res, { attraction, ticketTypes, images, reviews });
    } catch (err) { next(err); }
  },

  // POST /api/attractions  (admin)
  async create(req, res, next) {
    try {
      const {
        name, category, description, facilities, location, city, province,
        mapsLink, latitude, longitude, openTime, closeTime, openDays, isFeatured,
      } = req.body;

      const id   = uuidv4();
      const slug = slugify(name) + '-' + id.substring(0, 8);
      const coverImage = req.file ? `/uploads/attractions/${req.file.filename}` : null;

      const attraction = await AttractionModel.create({
        id, name, slug, category, description,
        facilities: Array.isArray(facilities) ? facilities : (facilities ? JSON.parse(facilities) : []),
        location, city, province, mapsLink, latitude, longitude,
        openTime, closeTime,
        openDays: Array.isArray(openDays) ? openDays : (openDays ? JSON.parse(openDays) : undefined),
        coverImage, isFeatured: isFeatured === 'true' || isFeatured === true,
      });

      return success(res, { attraction }, 'Attraction created successfully.', 201);
    } catch (err) { next(err); }
  },

  // PUT /api/attractions/:id  (admin)
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await AttractionModel.findById(id);
      if (!existing) return error(res, 'Attraction not found.', 404);

      const fields = { ...req.body };
      if (req.file) fields.cover_image = `/uploads/attractions/${req.file.filename}`;
      if (fields.facilities && typeof fields.facilities === 'string')
        fields.facilities = JSON.parse(fields.facilities);
      if (fields.openDays && typeof fields.openDays === 'string')
        fields.open_days = JSON.parse(fields.openDays);

      const attraction = await AttractionModel.update(id, fields);
      return success(res, { attraction }, 'Attraction updated successfully.');
    } catch (err) { next(err); }
  },

  // DELETE /api/attractions/:id  (admin)
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await AttractionModel.findById(id);
      if (!existing) return error(res, 'Attraction not found.', 404);
      await AttractionModel.delete(id);
      return success(res, {}, 'Attraction deleted successfully.');
    } catch (err) { next(err); }
  },

  // POST /api/attractions/:id/images  (admin)
  async addImage(req, res, next) {
    try {
      const { id } = req.params;
      if (!req.file) return error(res, 'No image file provided.', 400);
      const image = await AttractionModel.addImage({
        id:           uuidv4(),
        attractionId: id,
        imageUrl:     `/uploads/attractions/${req.file.filename}`,
        caption:      req.body.caption,
        sortOrder:    req.body.sortOrder || 0,
      });
      return success(res, { image }, 'Image added.', 201);
    } catch (err) { next(err); }
  },

  // DELETE /api/attractions/images/:imageId  (admin)
  async removeImage(req, res, next) {
    try {
      const { imageId } = req.params;
      await AttractionModel.deleteImage(imageId);
      return success(res, {}, 'Image removed.');
    } catch (err) { next(err); }
  },
};

module.exports = attractionController;
