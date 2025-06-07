// apiRouter.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function apiRouter(fastify, opts) {
  console.log('apiRouter is loaded!');

  // fetch repository
  fastify.route({
    method: 'GET',
    url: '/api/api/httpApi',
    preValidation: [fastify.verifyToken],
    handler: async function(request, reply) { // ✅ Added proper error handling
      try {
        const userId = request.user.id; // Assuming user info is in request.user
        const { repoId } = request.query; // Assuming repoId comes from query params
        
        if (!repoId) {
          return reply.badRequest('repoId is required');
        }
        
        const result = await fastify.fetchHttpApi(userId, repoId);
        return result;
      } catch (error) {
        fastify.log.error('Error in httpApi route:', error);
        throw error;
      }
    }
    // schema: fastify.getSchema('schema:api:http-api')
  });

    fastify.route({
    method: 'GET',
    url: '/api/api/read-api',
    handler: async function (request, reply) {
      return fastify.swagger();
    }
  });
});