// apiRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function apiRouter(fastify, opts) {
  console.log('apiRouter is loaded!');

  // Fetch HTTP API endpoint
  fastify.route({
    method: 'GET',
    url: '/httpApi',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchHttpApi, // Now uses the controller method directly
    schema: fastify.getSchema('schema:api:http-api')
  });

  // Read API/Swagger endpoint
  fastify.route({
    method: 'GET',
    url: '/read-api',
    handler: fastify.getSwaggerSpec // Uses the controller method
  });
});