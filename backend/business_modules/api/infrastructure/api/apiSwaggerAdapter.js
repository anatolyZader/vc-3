// apiSwaggerAdapter.js
'use strict';

const apiSpec = require('../../../../httpApiSpec.json');
const IApiPort = require('../../domain/ports/IApiPort');

class ApiSwaggerAdapter extends IApiPort {
  constructor() {
    super();
  }

  async fetchHttpApi(userId, repoId) {
    console.log(`Fetching API for userId: ${userId}, repoId: ${repoId}`);
    try {
      console.log(`Fetched API for userId: ${userId}, repoId: ${repoId}`);
      return apiSpec;
    } catch (error) {
      console.error(`Error fetching API for userId: ${userId}, repoId: ${repoId}:`, error);
      throw error;
    } 
  }
}

module.exports = ApiSwaggerAdapter;