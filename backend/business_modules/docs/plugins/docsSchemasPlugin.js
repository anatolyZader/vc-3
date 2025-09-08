/* eslint-disable no-unused-vars */
// docsSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function docsSchemasPlugin(fastify, opts) {
  console.log('docsSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:docs:fetch-docs', path: '../input/schemas/fetchDocsSchema.js' },
    { id: 'schema:docs:delete-page', path: '../input/schemas/deletePageSchema.js' },
    { id: 'schema:docs:fetch-page', path: '../input/schemas/fetchPageSchema.js' },
    { id: 'schema:docs:update-page', path: '../input/schemas/updatePageSchema.js' },
    { id: 'schema:docs:create-page', path: '../input/schemas/createPageSchema.js' }
  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      try {
        const schema = require(path);
        
        // Debug to help identify the issue
        if (schema.$id !== id) {
          fastify.log.warn(`Schema ID mismatch: Expected "${id}", but schema has "${schema.$id}"`);
          // Fix the mismatch by updating the schema's $id to match what the router expects
          schema.$id = id;
        }
        
        // Ensure type is set
        if (!schema.type) {
          schema.type = 'object';
          fastify.log.warn(`Schema missing type: Added "type": "object" to ${id}`);
        }
        
        fastify.addSchema(schema);
      } catch (error) {
        fastify.log.error(`Error loading schema "${id}" from path "${path}":`, error);
        throw fastify.httpErrors.internalServerError(
          `Failed to load schema "${id}" from path "${path}"`,
          { cause: error }
        );
      }
    }
  });
  console.log('DOCS Module - Registered Schemas:', 
  schemas.map(s => s.id).filter(id => fastify.getSchema(id) !== undefined)
);
});