/* eslint-disable no-unused-vars */
// monitorRouter.js
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function monitorRouter(fastify, opts) {
  fastify.route({
    method: 'GET',
    url: '/health',
    handler: fastify.checkHealth, 
  });
});