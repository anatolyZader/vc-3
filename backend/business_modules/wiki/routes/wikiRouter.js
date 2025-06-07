/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function wikiRouter(fastify, opts) {
  console.log('wikiRouter is loaded!');

  // Route to fetch a whole wiki
  fastify.route({
    method: 'GET',
    url: '/api/wiki/repos/:repoId/wiki',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchWiki,
    schema: fastify.getSchema('schema:wiki:fetch-wiki')
  });

  // Route to create a new wiki page
  fastify.route({
    method: 'POST',
    url: '/api/wiki/repos/:repoId/pages/create',
    preValidation: [fastify.verifyToken],
    handler: fastify.createPage,
    schema: fastify.getSchema('schema:wiki:create-page'),
  });

  // Route to fetch a specific wiki page
  fastify.route({
    method: 'GET',
    url: '/api/wiki/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.fetchPage,
    schema: fastify.getSchema('schema:wiki:fetch-page')
  });

  // Route to update wiki page content
  fastify.route({
    method: 'PUT',
    url: '/api/wiki/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.updatePage,
    schema: fastify.getSchema('schema:wiki:update-page')
  });

  // Route to delete a wiki page
  fastify.route({
    method: 'DELETE',
    url: '/api/wiki/repos/:repoId/pages/:pageId',
    preValidation: [fastify.verifyToken],
    handler: fastify.deletePage,
    schema: fastify.getSchema('schema:wiki:delete-page')
  });

 
});
