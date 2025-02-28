/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function wikiRouter(fastify, opts) {
  console.log('wikiRouter is loaded!');

  // Route to create a new wiki page
  fastify.route({
    method: 'POST',
    url: '/create',
    preValidation: [fastify.verifyToken],
    handler: fastify.createPage,
    schema: fastify.getSchema('schema:wiki:create-page'),
  });

  // Route to fetch a specific wiki page
  fastify.route({
    method: 'GET',
    url: '/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchPage,
    schema: fastify.getSchema('schema:wiki:fetch-page')
  });

  // Route to analyze a wiki page
  fastify.route({
    method: 'POST',
    url: '/:pageId/analyze',
    preValidation: [fastify.verifyToken],
    handler: fastify.analyzePage,
    schema: fastify.getSchema('schema:wiki:analyze-page')
  });

  // Route to update wiki page content
  fastify.route({
    method: 'PUT',
    url: '/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.updatePage,
    schema: fastify.getSchema('schema:wiki:update-page')
  });

  // Route to delete a wiki page
  fastify.route({
    method: 'DELETE',
    url: '/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.deletePage,
    schema: fastify.getSchema('schema:wiki:delete-page')
  });

 
});
