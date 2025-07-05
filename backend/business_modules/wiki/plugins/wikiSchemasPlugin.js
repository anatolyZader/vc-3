/* eslint-disable no-unused-vars */
// wikiSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function wikiSchemasPlugin(fastify, opts) {
  console.log('wikiSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:wiki:fetch-wiki', path: '../input/schemas/fetchWikiSchema.js' },
    { id: 'schema:wiki:analyze-page', path: '../input/schemas/analyzePageSchema.js' },
    { id: 'schema:wiki:delete-page', path: '../input/schemas/deletePageSchema.js' },
    { id: 'schema:wiki:fetch-page', path: '../input/schemas/fetchPageSchema.js' },
    { id: 'schema:wiki:update-page', path: '../input/schemas/updatePageSchema.js' },
  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      try {
        fastify.addSchema(require(path));
      } catch (error) {
        fastify.log.error(`Error loading schema "${id}" from path "${path}":`, error); 
        throw fastify.httpErrors.internalServerError(
          `Failed to load schema "${id}" from path "${path}"`,
          { cause: error } 
        );
      }
    }
  });
});
