'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function targetCodeRouter(fastify, opts) {
  console.log('targetCodeRouter is loaded!');

  // Route to fetch a target module
  fastify.route({
    method: 'GET',
    url: '/target-module/:moduleId',
    handler: fastify.fetchTargetCode,
  });
});
