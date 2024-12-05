/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function permRouter(fastify, opts) {
  // Role Routes
  fastify.route({
    method: 'GET',
    url: '/roles/:roleId',
    handler: fastify.getRoleById,
  });

  fastify.route({
    method: 'POST',
    url: '/roles',
    schema: {
      body: fastify.getSchema('schema:perm:createRole'),
    },
    handler: fastify.createRole,
  });

  fastify.route({
    method: 'PUT',
    url: '/roles/:roleId',
    schema: {
      body: fastify.getSchema('schema:perm:updateRole'),
    },
    handler: fastify.updateRole,
  });

  // Resource Routes
  fastify.route({
    method: 'GET',
    url: '/resources/:resourceId',
    handler: fastify.getResourceById,
  });

  fastify.route({
    method: 'POST',
    url: '/resources',
    schema: {
      body: fastify.getSchema('schema:perm:createResource'),
    },
    handler: fastify.createResource,
  });

  // Permission Routes
  fastify.route({
    method: 'GET',
    url: '/permissions/:roleId/:resourceId',
    handler: fastify.getPermissionByRoleAndResource,
  });

  fastify.route({
    method: 'POST',
    url: '/permissions',
    schema: {
      body: fastify.getSchema('schema:perm:createPermission'),
    },
    handler: fastify.createPermission,
  });

  // Policy Routes
  fastify.route({
    method: 'GET',
    url: '/policies/:policyId',
    handler: fastify.getPolicyById,
  });

  fastify.route({
    method: 'POST',
    url: '/policies',
    schema: {
      body: fastify.getSchema('schema:perm:createPolicy'),
    },
    handler: fastify.createPolicy,
  });
});
