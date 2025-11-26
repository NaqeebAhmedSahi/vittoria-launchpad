// electron/services/financeService.cjs
const FinanceModel = require('../models/financeModel.cjs');

const FinanceService = {
  async list(filters) {
    return await FinanceModel.list(filters);
  },

  async getById(id) {
    return await FinanceModel.getById(id);
  },

  async create(data) {
    return await FinanceModel.create(data);
  },

  async update(id, data) {
    return await FinanceModel.update(id, data);
  },

  async delete(id) {
    return await FinanceModel.delete(id);
  },

  async getSummary(filters) {
    return await FinanceModel.getSummary(filters);
  },

  async getCategories() {
    return await FinanceModel.getCategories();
  }
};

module.exports = FinanceService;
