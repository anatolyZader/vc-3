/* eslint-disable no-unused-vars */
// controllers/permController.js
const fp = require('fastify-plugin');

async function permController(fastify, options) {
  
  console.log(fastify.diContainer ? 'diContainer is defined' : 'diContainer is undefined');

  const permService = fastify.diContainer.resolve('permService');

  // Role Routes
  fastify.decorate('getRoleById', async function (request, reply) {
    try {
      const { roleId } = request.params;
      const role = await permService.getRoleById(roleId);
      reply.send(role);
    } catch (error) {
      fastify.log.error('Error getting role:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createRole', async function (request, reply) {
    try {
      const roleData = request.body;
      const newRole = await permService.createRole(roleData);
      reply.send(newRole);
    } catch (error) {
      fastify.log.error('Error creating role:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('updateRole', async function (request, reply) {
    try {
      const { roleId } = request.params;
      const roleData = request.body;
      const updatedRole = await permService.updateRole(roleId, roleData);
      reply.send(updatedRole);
    } catch (error) {
      fastify.log.error('Error updating role:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Resource Routes
  fastify.decorate('getResourceById', async function (request, reply) {
    try {
      const { resourceId } = request.params;
      const resource = await permService.getResourceById(resourceId);
      reply.send(resource);
    } catch (error) {
      fastify.log.error('Error getting resource:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createResource', async function (request, reply) {
    try {
      const resourceData = request.body;
      const newResource = await permService.createResource(resourceData);
      reply.send(newResource);
    } catch (error) {
      fastify.log.error('Error creating resource:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Permission Routes
  fastify.decorate('getPermissionByRoleAndResource', async function (request, reply) {
    try {
      const { roleId, resourceId } = request.params;
      const permission = await permService.getPermissionByRoleAndResource(roleId, resourceId);
      reply.send(permission);
    } catch (error) {
      fastify.log.error('Error getting permission:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createPermission', async function (request, reply) {
    try {
      const permissionData = request.body;
      const newPermission = await permService.createPermission(permissionData);
      reply.send(newPermission);
    } catch (error) {
      fastify.log.error('Error creating permission:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Policy Routes
  fastify.decorate('getPolicyById', async function (request, reply) {
    try {
      const { policyId } = request.params;
      const policy = await permService.getPolicyById(policyId);
      reply.send(policy);
    } catch (error) {
      fastify.log.error('Error getting policy:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createPolicy', async function (request, reply) {
    try {
      const policyData = request.body;
      const newPolicy = await permService.createPolicy(policyData);
      reply.send(newPolicy);
    } catch (error) {
      fastify.log.error('Error creating policy:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

}

module.exports = fp(permController);