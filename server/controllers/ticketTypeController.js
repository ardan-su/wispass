const { v4: uuidv4 }    = require('uuid');
const TicketTypeModel   = require('../models/TicketTypeModel');
const AttractionModel   = require('../models/AttractionModel');
const { success, error } = require('../utils/helpers');

const ticketTypeController = {
  async listByAttraction(req, res, next) {
    try {
      const onlyActive = req.user?.role !== 'admin';
      const rows = await TicketTypeModel.findByAttraction(req.params.attractionId, onlyActive);
      return success(res, { ticketTypes: rows });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const attr = await AttractionModel.findById(req.params.attractionId);
      if (!attr) return error(res, 'Attraction not found.', 404);
      const tt = await TicketTypeModel.create({ id: uuidv4(), attractionId: attr.id, ...req.body });
      return success(res, { ticketType: tt }, 'Ticket type created.', 201);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const tt = await TicketTypeModel.findById(req.params.id);
      if (!tt) return error(res, 'Ticket type not found.', 404);
      const updated = await TicketTypeModel.update(req.params.id, req.body);
      return success(res, { ticketType: updated }, 'Ticket type updated.');
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await TicketTypeModel.delete(req.params.id);
      return success(res, {}, 'Ticket type deleted.');
    } catch (err) { next(err); }
  },

  async availability(req, res, next) {
    try {
      const { attractionId } = req.params;
      const { date } = req.query;
      if (!date) return error(res, 'Date is required.', 400);
      const types = await TicketTypeModel.findByAttraction(attractionId, true);
      const result = await Promise.all(types.map(async tt => {
        const booked    = await TicketTypeModel.getBookedCount(tt.id, date);
        const remaining = tt.daily_quota - booked;
        return { ...tt, booked, remaining, available: remaining > 0 };
      }));
      return success(res, { ticketTypes: result, date });
    } catch (err) { next(err); }
  },
};

module.exports = ticketTypeController;
