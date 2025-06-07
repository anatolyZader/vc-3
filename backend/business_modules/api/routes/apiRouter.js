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
    handler: fastify.fetchHttpApi,
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