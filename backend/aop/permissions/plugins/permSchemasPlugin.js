/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function permSchemasPlugin(fastify, opts) {
  const schemas = [
    { id: 'schema:perm:createRole', path: '../routes/schemas/createRole.json' },
    { id: 'schema:perm:updateRole', path: '../routes/schemas/updateRole.json' },
    { id: 'schema:perm:createResource', path: '../routes/schemas/createResource.json' },
    { id: 'schema:perm:createPermission', path: '../routes/schemas/createPermission.json' },
    { id: 'schema:perm:createPolicy', path: '../routes/schemas/createPolicy.json' },
  ];

  schemas.forEach(({ id, path }) => {
    if (!fastify.getSchema(id)) {
      fastify.addSchema(require(path));
    }
  });
});
