// apiController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function apiController(fastify, options) {

  fastify.decorate('fetchHttpApi', async (userId, repoId) => {
    try {
      const apiService = await fastify.diScope.resolve('apiService');
      const httpApi = await apiService.fetchHttpApi(userId, repoId);
      return httpApi;
    } catch (error) {
      fastify.log.error('Error fetching http api:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch http api', { cause: error });
    }
  });
}

module.exports = fp(apiController);
