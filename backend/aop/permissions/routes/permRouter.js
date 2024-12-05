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

  fastify.route({
    method: 'DELETE',
    url: '/roles/:roleId',
    handler: fastify.deleteRole,
  });

  fastify.route({
    method: 'GET',
    url: '/roles',
    handler: fastify.getAllRoles,
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

  fastify.route({
    method: 'DELETE',
    url: '/resources/:resourceId',
    handler: fastify.deleteResource,
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

  fastify.route({
    method: 'DELETE',
    url: '/permissions/:roleId/:resourceId',
    handler: fastify.deletePermission,
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

  fastify.route({
    method: 'DELETE',
    url: '/policies/:policyId',
    handler: fastify.deletePolicy,
  });

  fastify.route({
    method: 'GET',
    url: '/policies',
    handler: fastify.getAllPolicies,
  });
});
