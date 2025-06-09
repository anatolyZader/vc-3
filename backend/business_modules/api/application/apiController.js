// apiController.js
'use strict';

const fp = require('fastify-plugin');

async function apiController(fastify, options) {

  // HTTP route handler - extract params from request
  fastify.decorate('fetchHttpApi', async (request, reply) => {
    try {
      const userId = request.user.id; // From verifyToken middleware
      const { repoId } = request.query; // From query params
      
      if (!repoId) {
        return reply.badRequest('repoId is required');
      }
      
      fastify.log.info(`Processing fetchHttpApi HTTP request for user: ${userId}, repo: ${repoId}`);
      
      const apiService = await fastify.diScope.resolve('apiService');
      if (!apiService) {
        throw new Error('API service not found in DI container');
      }
      
      const httpApi = await apiService.fetchHttpApi(userId, repoId);
      
      fastify.log.info(`HTTP API fetched via HTTP: ${JSON.stringify(httpApi)}`);
      return httpApi;
    } catch (error) {
      fastify.log.error('Error fetching HTTP API:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch HTTP API', { cause: error });
    }
  });

  // Swagger endpoint handler
  fastify.decorate('getSwaggerSpec', async (request, reply) => {
    try {
      fastify.log.info('Processing getSwaggerSpec HTTP request');
      
      const swaggerSpec = fastify.swagger();
      
      fastify.log.info('Swagger spec retrieved successfully');
      return swaggerSpec;
    } catch (error) {
      fastify.log.error('Error getting swagger spec:', error);
      throw fastify.httpErrors.internalServerError('Failed to get swagger spec', { cause: error });
    }
  });
}

module.exports = fp(apiController);