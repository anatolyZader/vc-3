/* eslint-disable no-unused-vars */
// authSchemasPlugin.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function authSchemasPlugin(fastify, opts) {
  console.log('authPlugin loaded!');

  const schemas = [
    { id: 'schema:auth:register', path: '../routes/schemas/register.json' },
    { id: 'schema:auth:token-header', path: '../routes/schemas/token-header.json' },
    { id: 'schema:auth:token', path: '../routes/schemas/token.json' },
    { id: 'schema:auth:user', path: '../routes/schemas/user.json' },
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
