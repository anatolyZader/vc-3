/* eslint-disable no-unused-vars */
// aiSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiSchemasPlugin(fastify, opts) {
  console.log('aiSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:ai:respond-to-prompt', path: '../input/schemas/respondToPromptSchema.js' },
    { id: 'schema:ai:process-pushed-repo', path: '../input/schemas/processPushedRepoSchema.js' },
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
      console.log('AI Module - Registered Schemas:', 
    schemas.map(s => s.id).filter(id => fastify.getSchema(id) !== undefined)
);
});
