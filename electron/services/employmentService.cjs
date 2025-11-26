const EmploymentModel = require('../models/employmentModel.cjs');

module.exports = {
  async list(filters) {
    return await EmploymentModel.list(filters);
  },
  
  async getById(id) {
    return await EmploymentModel.getById(id);
  },
  
  async create(data) {
    return await EmploymentModel.create(data);
  },
  
  async update(id, data) {
    return await EmploymentModel.update(id, data);
  },
  
  async delete(id) {
    return await EmploymentModel.delete(id);
  }
};
