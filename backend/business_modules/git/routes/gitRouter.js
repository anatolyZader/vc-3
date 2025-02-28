'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

module.exports = fp(async function gitRouter(fastify, opts) {
  console.log('gitRouter is loaded!');

  // Route to fetch a repository
  fastify.route({
    method: 'GET',
    url: '/repositories/:repositoryId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchRepository,
    schema: fastify.getSchema('schema:git:fetch-repository')
  });

  // Route to analyze a repository
  fastify.route({
    method: 'POST',
    url: '/repositories/:repositoryId/analyze',
    preValidation: [fastify.verifyToken],
    handler: fastify.analyzeRepository,
    schema: fastify.getSchema('schema:git:analyze-repository') 
  });

});
