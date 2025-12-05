const TeamModel = require('../models/teamModel.cjs');

module.exports = {
  async list(firmId) {
    return await TeamModel.list(firmId);
  },
  
  async listPaged(filters) {
    return await TeamModel.listPaged(filters);
  },
  
  async getById(id) {
    return await TeamModel.getById(id);
  },
  
  async create(data) {
    return await TeamModel.create(data);
  },
  
  async update(id, data) {
    return await TeamModel.update(id, data);
  },
  
  async delete(id) {
    return await TeamModel.delete(id);
  },
  
  async getTeamMembers(teamId) {
    return await TeamModel.getTeamMembers(teamId);
  }
};
