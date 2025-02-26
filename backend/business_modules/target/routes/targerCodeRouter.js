'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function targetRouter(fastify, opts) {
  console.log('targetRouter is loaded!');

  // Route to fetch a target module
  fastify.route({
    method: 'GET',
    url: '/target-code/:moduleId',
    handler: fastify.fetchtarget,
    schema: fastify.getSchema('schema:target-code:get')
  });
});
