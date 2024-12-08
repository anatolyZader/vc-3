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
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createRole', async (request, reply) => {
    const { id, name, description } = request.body;
    try {
      const newRole = await permService.createRole({ id, name, description });
      reply.send({ message: 'Role created successfully', role: newRole });
    } catch (error) {
      fastify.log.error('Error creating role:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
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
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('deleteRole', async (request, reply) => {
    const { roleId } = request.params;
    try {
      await permService.deleteRole(roleId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting role:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('getAllRoles', async (request, reply) => {
    try {
      const roles = await permService.getAllRoles();
      reply.send(roles);
    } catch (error) {
      fastify.log.error('Error fetching all roles:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('getResourceById', async (request, reply) => {
    const { resourceId } = request.params;
    try {
      const resource = await permService.getResourceById(resourceId);
      reply.send(resource);
    } catch (error) {
      fastify.log.error('Error getting resource:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createResource', async (request, reply) => {
    const { id, name, type } = request.body;
    try {
      const newResource = await permService.createResource({ id, name, type });
      reply.send({ message: 'Resource created successfully', resource: newResource });
    } catch (error) {
      fastify.log.error('Error creating resource:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('deleteResource', async (request, reply) => {
    const { resourceId } = request.params;
    try {
      await permService.deleteResource(resourceId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting resource:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
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
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
  

  fastify.decorate('getPermissionByRoleAndResource', async (request, reply) => {
    const { roleId, resourceId } = request.params;
    try {
      const permission = await permService.getPermissionByRoleAndResource(roleId, resourceId);
      reply.send(permission);
    } catch (error) {
      fastify.log.error('Error getting permission:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createPermission', async (request, reply) => {
    const permissionData = request.body;
    try {
      const newPermission = await permService.createPermission(permissionData);
      reply.send({ message: 'Permission created successfully', permission: newPermission });
    } catch (error) {
      fastify.log.error('Error creating permission:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('deletePermission', async (request, reply) => {
    const { roleId, resourceId } = request.params;
    try {
      await permService.deletePermission(roleId, resourceId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting permission:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
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
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
  

  fastify.decorate('getPolicyById', async (request, reply) => {
    const { policyId } = request.params;
    try {
      const policy = await permService.getPolicyById(policyId);
      reply.send(policy);
    } catch (error) {
      fastify.log.error('Error getting policy:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('createPolicy', async (request, reply) => {
    const policyData = request.body;
    try {
      const newPolicy = await permService.createPolicy(policyData);
      reply.send({ message: 'Policy created successfully', policy: newPolicy });
    } catch (error) {
      fastify.log.error('Error creating policy:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('deletePolicy', async (request, reply) => {
    const { policyId } = request.params;
    try {
      await permService.deletePolicy(policyId);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error('Error deleting policy:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
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
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
  

  fastify.decorate('getAllPolicies', async (request, reply) => {
    try {
      const policies = await permService.getAllPolicies();
      reply.send(policies);
    } catch (error) {
      fastify.log.error('Error fetching all policies:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    try {
      // Check if the DI container is properly registered
      if (!fastify.diContainer) {
        fastify.log.error('DI Container is not available');
        throw new Error('DI Container is not available');
      }
  
      // Check if the 'userService' is registered in the DI container
      const permServiceRegistered = fastify.diContainer.has('permService');
      if (!permServiceRegistered) {
        fastify.log.error('PermService is not registered in the DI container');
        throw new Error('PermService is not registered');
      }
  
      // Resolve userService from the DI container
      permService = await fastify.diContainer.resolve('permService');
      fastify.log.info('PermService resolved successfully:', permService);
  
      // You can now safely use userService in other hooks or routes
    } catch (error) {
      fastify.log.error('Error resolving PermService:', error);
      throw new Error('Failed to resolve PermService. Ensure it is registered in the DI container.');
    }
  });

};

module.exports = fp(permController);
