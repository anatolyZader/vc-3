/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function projectWikiRouter(fastify, opts) {
  console.log('wikiRouter is loaded!');

  // Route to create a new wiki page
  fastify.route({
    method: 'POST',
    url: '/create',
    handler: fastify.createPage,
    schema: fastify.getSchema('schema:wiki:create-page'),
  });

  // Route to fetch the list of wiki pages
  fastify.route({
    method: 'GET',
    url: '/list',
    handler: fastify.fetchPagesList,
    schema: fastify.getSchema('schema:wiki:fetch-pages-list')
  });

  // Route to fetch a specific wiki page
  fastify.route({
    method: 'GET',
    url: '/:pageId',
    handler: fastify.fetchPage,
    schema: fastify.getSchema('schema:wiki:fetch-page')
  });

  // Route to rename a wiki page
  fastify.route({
    method: 'PATCH',
    url: '/:pageId/rename',
    handler: fastify.renamePage,
    schema: fastify.getSchema('schema:wiki:rename-page')
  });

  // Route to delete a wiki page
  fastify.route({
    method: 'DELETE',
    url: '/:pageId',
    handler: fastify.deletePage,
    schema: fastify.getSchema('schema:wiki:delete-page')
  });

  // Route to update wiki page content
  fastify.route({
    method: 'PATCH',
    url: '/:pageId/content',
    handler: fastify.updatePageContent,
    schema: fastify.getSchema('schema:wiki:update-page-content')
  });
});
