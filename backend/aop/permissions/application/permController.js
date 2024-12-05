/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin');

async function permController(fastify, options) {
  const permService = fastify.diContainer.resolve('permService');

  const handleError = (error, reply) => {
    fastify.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  };

  // Role Routes
  fastify.decorate('getRoleById', async (request, reply) => {
    try {
      const { roleId } = request.params;
      const role = await permService.getRoleById(roleId);
      reply.send(role);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('createRole', async (request, reply) => {
    try {
      const roleData = request.body;
      const newRole = await permService.createRole(roleData);
      reply.send(newRole);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('updateRole', async (request, reply) => {
    try {
      const { roleId } = request.params;
      const roleData = request.body;
      const updatedRole = await permService.updateRole(roleId, roleData);
      reply.send(updatedRole);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('deleteRole', async (request, reply) => {
    try {
      const { roleId } = request.params;
      await permService.deleteRole(roleId);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('getAllRoles', async (request, reply) => {
    try {
      const roles = await permService.getAllRoles();
      reply.send(roles);
    } catch (error) {
      handleError(error, reply);
    }
  });

  // Resource Routes
  fastify.decorate('getResourceById', async (request, reply) => {
    try {
      const { resourceId } = request.params;
      const resource = await permService.getResourceById(resourceId);
      reply.send(resource);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('createResource', async (request, reply) => {
    try {
      const resourceData = request.body;
      const newResource = await permService.createResource(resourceData);
      reply.send(newResource);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('deleteResource', async (request, reply) => {
    try {
      const { resourceId } = request.params;
      await permService.deleteResource(resourceId);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // Permission Routes
  fastify.decorate('getPermissionByRoleAndResource', async (request, reply) => {
    try {
      const { roleId, resourceId } = request.params;
      const permission = await permService.getPermissionByRoleAndResource(roleId, resourceId);
      reply.send(permission);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('createPermission', async (request, reply) => {
    try {
      const permissionData = request.body;
      const newPermission = await permService.createPermission(permissionData);
      reply.send(newPermission);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('deletePermission', async (request, reply) => {
    try {
      const { roleId, resourceId } = request.params;
      await permService.deletePermission(roleId, resourceId);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // Policy Routes
  fastify.decorate('getPolicyById', async (request, reply) => {
    try {
      const { policyId } = request.params;
      const policy = await permService.getPolicyById(policyId);
      reply.send(policy);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('createPolicy', async (request, reply) => {
    try {
      const policyData = request.body;
      const newPolicy = await permService.createPolicy(policyData);
      reply.send(newPolicy);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('deletePolicy', async (request, reply) => {
    try {
      const { policyId } = request.params;
      await permService.deletePolicy(policyId);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.decorate('getAllPolicies', async (request, reply) => {
    try {
      const policies = await permService.getAllPolicies();
      reply.send(policies);
    } catch (error) {
      handleError(error, reply);
    }
  });
}

module.exports = fp(permController);
