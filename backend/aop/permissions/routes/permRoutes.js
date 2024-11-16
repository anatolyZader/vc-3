// routes/permRoutes.js

const fastify = require('fastify');

async function permRoutes(fastify, options) {

  const permissionsService = fastify.diContainer.resolve('permissionsService');

  // Role Routes
  fastify.get('/roles/:roleId', async (request, reply) => {
    // Get a role by ID
    const { roleId } = request.params;
    const role = await permissionsService.getRoleById(roleId);
    reply.send(role);
  });

  fastify.post('/roles', async (request, reply) => {
    // Create a new role
    const roleData = request.body;
    const newRole = await permissionsService.createRole(roleData);
    reply.send(newRole);
  });

  fastify.put('/roles/:roleId', async (request, reply) => {
    // Update an existing role
    const { roleId } = request.params;
    const roleData = request.body;
    const updatedRole = await permissionsService.updateRole(roleId, roleData);
    reply.send(updatedRole);
  });

  // Resource Routes
  fastify.get('/resources/:resourceId', async (request, reply) => {
    // Get a resource by ID
    const { resourceId } = request.params;
    const resource = await permissionsService.getResourceById(resourceId);
    reply.send(resource);
  });

  fastify.post('/resources', async (request, reply) => {
    // Create a new resource
    const resourceData = request.body;
    const newResource = await permissionsService.createResource(resourceData);
    reply.send(newResource);
  });

  // Permission Routes
  fastify.get('/permissions/:roleId/:resourceId', async (request, reply) => {
    // Get a permission by role ID and resource ID
    const { roleId, resourceId } = request.params;
    const permission = await permissionsService.getPermissionByRoleAndResource(roleId, resourceId);
    reply.send(permission);
  });

  fastify.post('/permissions', async (request, reply) => {
    // Create a new permission
    const permissionData = request.body;
    const newPermission = await permissionsService.createPermission(permissionData);
    reply.send(newPermission);
  });

  // Policy Routes
  fastify.get('/policies/:policyId', async (request, reply) => {
    // Get a policy by ID
    const { policyId } = request.params;
    const policy = await permissionsService.getPolicyById(policyId);
    reply.send(policy);
  });

  fastify.post('/policies', async (request, reply) => {
    // Create a new policy
    const policyData = request.body;
    const newPolicy = await permissionsService.createPolicy(policyData);
    reply.send(newPolicy);
  });

}

module.exports = permRoutes;