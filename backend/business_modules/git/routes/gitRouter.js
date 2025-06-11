'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function gitRouter(fastify, opts) {
  console.log('gitRouter is loaded!');

  // fetch repository
  fastify.route({
    method: 'GET',
    url: '/repositories/:repoId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchRepo,
    schema: fastify.getSchema('schema:git:fetch-repo')
  });

});
