/* eslint-disable no-unused-vars */
// apiSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function apiSchemasPlugin(fastify, opts) {
  console.log('apiSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:api:http-api', path: '../input/schemas/fetchHttpApiSchema.js' },
    { id: 'schema:api:read-api', path: '../input/schemas/readApiSchema.js' },
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
  console.log('API Module - Registered Schemas:', 
  schemas.map(s => s.id).filter(id => fastify.getSchema(id) !== undefined)
);
});