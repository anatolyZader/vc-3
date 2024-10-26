/* eslint-disable no-unused-vars */
// authSchemasLoader.js

'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function schemaLoaderPlugin(fastify, opts) {
  const schemas = [
    { id: 'schema:auth:register', path: '../routes/schemas/register.json' },
    { id: 'schema:auth:token-header', path: '../routes/schemas/token-header.json' },
    { id: 'schema:auth:token', path: '../routes/schemas/token.json' },
    { id: 'schema:auth:user', path: '../routes/schemas/user.json' },
  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      fastify.addSchema(require(path));
    }
  });
});
