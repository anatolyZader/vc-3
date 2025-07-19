// apiSwaggerAdapter.js
'use strict';

const path = require('path');
const IApiPort = require('../../domain/ports/IApiPort');
const backendRoot = path.resolve(__dirname, '../../../..');
const specPath = path.join(backendRoot, 'httpApiSpec.json');

// Load and parse the OpenAPI spec once at module load
const openapiSpec = require(specPath);


class ApiSwaggerAdapter extends IApiPort {
  constructor() {
    super();
  }

  async fetchHttpApi(userId, repoId) {
    console.log(`Fetching API for userId: ${userId}, repoId: ${repoId}`);
    try {
      console.log(`Fetched API for userId: ${userId}, repoId: ${repoId}`);
      return openapiSpec;
    } catch (error) {
      console.error(`Error fetching API for userId: ${userId}, repoId: ${repoId}:`, error);
      throw error;
    } 
  }
}

module.exports = ApiSwaggerAdapter;