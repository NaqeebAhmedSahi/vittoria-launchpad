const PeopleModel = require('../models/peopleModel.cjs');

module.exports = {
  async list(filters) {
    return await PeopleModel.list(filters);
  },
  
  async getById(id) {
    return await PeopleModel.getById(id);
  },
  
  async create(data) {
    return await PeopleModel.create(data);
  },
  
  async update(id, data) {
    return await PeopleModel.update(id, data);
  },
  
  async delete(id) {
    return await PeopleModel.delete(id);
  },
  
  async getEmploymentHistory(personId) {
    return await PeopleModel.getEmploymentHistory(personId);
  }
};
