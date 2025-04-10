'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');
let permService;

const permController = async (fastify, options) => {
  fastify.decorate('getRoleById', async (request, reply) => {
    try {
      const { roleId } = request.params;
      const role = await permService.getRoleById(roleId);
      reply.send(role);
    } catch (error) {
      fastify.log.error('Error getting role:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('createRole', async (request, reply) => {
    const { id, name, description } = request.body;
    try {
      const newRole = await permService.createRole({ id, name, description });
      reply.send({ message: 'Role created successfully', role: newRole });
    } catch (error) {
      fastify.log.error('Error creating role:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('updateRole', async (request, reply) => {
    const { roleId } = request.params;
    const roleData = request.body;
    try {
      const updatedRole = await permService.updateRole(roleId, roleData);
      reply.send({ message: 'Role updated successfully', role: updatedRole });
    } catch (error) {
      fastify.log.error('Error updating role:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('deleteRole', async (request, reply) => {
    const { roleId } = request.params;
    try {
      await permService.deleteRole(roleId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting role:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('getAllRoles', async (request, reply) => {
    try {
      const roles = await permService.getAllRoles();
      reply.send(roles);
    } catch (error) {
      fastify.log.error('Error fetching all roles:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('getResourceById', async (request, reply) => {
    const { resourceId } = request.params;
    try {
      const resource = await permService.getResourceById(resourceId);
      reply.send(resource);
    } catch (error) {
      fastify.log.error('Error getting resource:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('createResource', async (request, reply) => {
    const { id, name, type } = request.body;
    try {
      const newResource = await permService.createResource({ id, name, type });
      reply.send({ message: 'Resource created successfully', resource: newResource });
    } catch (error) {
      fastify.log.error('Error creating resource:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('deleteResource', async (request, reply) => {
    const { resourceId } = request.params;
    try {
      await permService.deleteResource(resourceId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting resource:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('updateResource', async (request, reply) => {
    const { resourceId } = request.params;
    const resourceData = request.body;
    try {
      const updatedResource = await permService.updateResource(resourceId, resourceData);
      reply.send({ message: 'Resource updated successfully', resource: updatedResource });
    } catch (error) {
      fastify.log.error('Error updating resource:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('getPermissionByRoleAndResource', async (request, reply) => {
    const { roleId, resourceId } = request.params;
    try {
      const permission = await permService.getPermissionByRoleAndResource(roleId, resourceId);
      reply.send(permission);
    } catch (error) {
      fastify.log.error('Error getting permission:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('createPermission', async (request, reply) => {
    const permissionData = request.body;
    try {
      const newPermission = await permService.createPermission(permissionData);
      reply.send({ message: 'Permission created successfully', permission: newPermission });
    } catch (error) {
      fastify.log.error('Error creating permission:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('deletePermission', async (request, reply) => {
    const { roleId, resourceId } = request.params;
    try {
      await permService.deletePermission(roleId, resourceId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting permission:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('updatePermission', async (request, reply) => {
    const { roleId, resourceId } = request.params;
    const permissionData = request.body;
    try {
      const updatedPermission = await permService.updatePermission(roleId, resourceId, permissionData);
      reply.send({ message: 'Permission updated successfully', permission: updatedPermission });
    } catch (error) {
      fastify.log.error('Error updating permission:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('getPolicyById', async (request, reply) => {
    const { policyId } = request.params;
    try {
      const policy = await permService.getPolicyById(policyId);
      reply.send(policy);
    } catch (error) {
      fastify.log.error('Error getting policy:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('createPolicy', async (request, reply) => {
    const policyData = request.body;
    try {
      const newPolicy = await permService.createPolicy(policyData);
      reply.send({ message: 'Policy created successfully', policy: newPolicy });
    } catch (error) {
      fastify.log.error('Error creating policy:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('deletePolicy', async (request, reply) => {
    const { policyId } = request.params;
    try {
      await permService.deletePolicy(policyId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting policy:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('updatePolicy', async (request, reply) => {
    const { policyId } = request.params;
    const policyData = request.body;
    try {
      const updatedPolicy = await permService.updatePolicy(policyId, policyData);
      reply.send({ message: 'Policy updated successfully', policy: updatedPolicy });
    } catch (error) {
      fastify.log.error('Error updating policy:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.decorate('getAllPolicies', async (request, reply) => {
    try {
      const policies = await permService.getAllPolicies();
      reply.send(policies);
    } catch (error) {
      fastify.log.error('Error fetching all policies:', error); 
      return reply.internalServerError('Internal Server Error', { cause: error }); 
    }
  });

  fastify.addHook('onReady', async function () {
    try {
      if (!fastify.diContainer) {
        fastify.log.error('DI Container is not available'); 
        throw fastify.httpErrors.internalServerError('DI Container is not available'); 
      }

      const permServiceRegistered = fastify.diContainer.has('permService');
      if (!permServiceRegistered) {
        fastify.log.error('PermService is not registered in the DI container'); 
        throw fastify.httpErrors.internalServerError('PermService is not registered'); 
      }

      permService = await fastify.diContainer.resolve('permService');
      fastify.log.info('PermService resolved successfully:', permService);

    } catch (error) {
      fastify.log.error('Error resolving PermService:', error); 
      throw fastify.httpErrors.internalServerError(
        'Failed to resolve PermService. Ensure it is registered in the DI container.',
        { cause: error } 
      );
    }
  });
};

module.exports = fp(permController);
