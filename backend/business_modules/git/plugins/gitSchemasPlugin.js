/* eslint-disable no-unused-vars */
// gitSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function gitSchemasPlugin(fastify, opts) {
  console.log('gitSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:git:create-project', path: '../input/schemas/createProjectSchema.js' },
    { id: 'schema:git:fetch-project-list', path: '../input/schemas/fetchProjectListSchema.js' },
    { id: 'schema:git:fetch-project', path: '../input/schemas/fetchProjectSchema.js' },
    { id: 'schema:git:rename-project', path: '../input/schemas/renameProjectSchema.js' },
    { id: 'schema:git:delete-project', path: '../input/schemas/deleteProjectSchema.js' },
    { id: 'schema:git:add-repository', path: '../input/schemas/addRepositorySchema.js' },
    { id: 'schema:git:remove-repository', path: '../input/schemas/removeRepositorySchema.js' },
    { id: 'schema:git:fetch-repository', path: '../input/schemas/fetchRepoSchema.js' },
    { id: 'schema:git:analyze-repository', path: '../input/schemas/analyzeRepositorySchema.js' },
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
  console.log('GIT Module - Registered Schemas:', 
  schemas.map(s => s.id).filter(id => fastify.getSchema(id) !== undefined)
);
});