const SourceModel = require('../models/sourceModel.cjs');

module.exports = {
  async list() {
    return await SourceModel.list();
  },
  
  async getById(id) {
    return await SourceModel.getById(id);
  },
  
  async create(data) {
    return await SourceModel.create(data);
  },
  
  async getOrgPattern() {
    return await SourceModel.getOrgPattern();
  },
  
  async importHistoricalData(rows) {
    return await SourceModel.importHistoricalData(rows);
  },

  async bulkUpdate(updates) {
    return await SourceModel.bulkUpdate(updates);
  }
};
