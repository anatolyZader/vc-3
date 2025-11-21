'use strict';
const fp = require('fastify-plugin');

module.exports = fp(async function apiRouter(fastify, opts) {
  console.log('apiRouter is loaded!');

  // Fetch HTTP API endpoint
  fastify.route({
    method: 'GET',
    url: '/httpApi',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchHttpApi,
    schema: {
      tags: ['api'],
      querystring: {
        type: 'object',
        required: ['repoId'],
        properties: {
          repoId: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            // Adjust these properties to match what your apiService.fetchHttpApi returns!
            result: { type: 'string' },
            data: { type: 'object' }
          },
          additionalProperties: true // or false if you want strict
        }
      }
    }
  });

  // Read API/Swagger endpoint
  fastify.route({
    method: 'GET',
    url: '/read-api',
    handler: fastify.getSwaggerSpec,
    schema: {
      tags: ['api'],
      response: {
        200: {
          type: 'object', // The Swagger spec is an object
          additionalProperties: true
        }
      }
    }
  });
});