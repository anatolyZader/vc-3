/* eslint-disable no-unused-vars */
// gitSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function gitSchemasPlugin(fastify, opts) {
  console.log('gitSchemasPlugin loaded!');

  const schemas = [
    { id: 'schema:git:create-project', path: '../routes/schemas/git/createProjectSchema.js' },
    { id: 'schema:git:fetch-project-list', path: '../routes/schemas/git/fetchProjectListSchema.js' },
    { id: 'schema:git:fetch-project', path: '../routes/schemas/git/fetchProjectSchema.js' },
    { id: 'schema:git:rename-project', path: '../routes/schemas/git/renameProjectSchema.js' },
    { id: 'schema:git:delete-project', path: '../routes/schemas/git/deleteProjectSchema.js' },
    { id: 'schema:git:add-repository', path: '../routes/schemas/git/addRepositorySchema.js' },
    { id: 'schema:git:remove-repository', path: '../routes/schemas/git/removeRepositorySchema.js' },
    { id: 'schema:git:fetch-repository', path: '../routes/schemas/git/fetchRepositorySchema.js' },
    { id: 'schema:git:analyze-repository', path: '../routes/schemas/git/analyzeRepositorySchema.js' },
    { id: 'schema:git:fetch-target-module', path: '../routes/schemas/git/fetchTargetModuleSchema.js' }
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
