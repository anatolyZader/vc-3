// apiSwaggerAdapter.js
'use strict';
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const IApiPort = require('../../domain/ports/IApiPort');

const projectRoot = path.resolve(__dirname, '../../../../');
const specPath = path.join(projectRoot, 'httpApiSpec.yml');

// Load and parse the OpenAPI spec once at module load
let openapiSpec;
try {
  openapiSpec = yaml.load(fs.readFileSync(specPath, 'utf8'));
} catch (err) {
  console.error(`[ApiSwaggerAdapter] Failed to load httpApiSpec.yml at ${specPath}:`, err);
  openapiSpec = null;
}


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