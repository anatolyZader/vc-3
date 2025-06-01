'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function apiRouter(fastify, opts) {
  console.log('apiRouter is loaded!');

  // fetch repository
  fastify.route({
    method: 'GET',
    url: '/httpApi',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchRepo,
    schema: fastify.getSchema('schema:api:http-api')
  });

});
