const Role = require('../../domain/entities/role');
const Resource = require('../../domain/entities/resource');
const Permission = require('../../domain/entities/permission');
const Policy = require('../../domain/entities/policy');

class PermService {
  constructor(permPersistPort) {
    this.permPersistPort = permPersistPort;
  }

  // Role Methods
  async getRoleById(roleId) {
    const role = await this.permPersistPort.findRoleById(roleId);
    if (!role) throw new Error('Role not found');
    return role;
  }

  async createRole(roleData) {
    if (!roleData.id || !roleData.name) throw new Error('Role data is invalid');
    const newRole = new Role(roleData.id, roleData.name, roleData.description);
    await this.permPersistPort.saveRole(newRole);
    return newRole;
  }

  async updateRole(roleId, roleData) {
    const role = await this.getRoleById(roleId);
    if (roleData.name) role.rename(roleData.name);
    if (roleData.description) role.updateDescription(roleData.description);
    await this.permPersistPort.saveRole(role);
    return role;
  }

  async deleteRole(roleId) {
    const role = await this.getRoleById(roleId);
    if (!role) throw new Error('Role not found');
    await this.permPersistPort.deleteRole(roleId);
  }

  async getAllRoles() {
    return await this.permPersistPort.findAllRoles();
  }

  // Resource Methods
  async getResourceById(resourceId) {
    const resource = await this.permPersistPort.findResourceById(resourceId);
    if (!resource) throw new Error('Resource not found');
    return resource;
  }

  async createResource(resourceData) {
    if (!resourceData.id || !resourceData.name || !resourceData.type)
      throw new Error('Resource data is invalid');
    const newResource = new Resource(resourceData.id, resourceData.name, resourceData.type);
    await this.permPersistPort.saveResource(newResource);
    return newResource;
  }

  async deleteResource(resourceId) {
    const resource = await this.getResourceById(resourceId);
    if (!resource) throw new Error('Resource not found');
    await this.permPersistPort.deleteResource(resourceId);
  }

  // Permission Methods
  async getPermissionByRoleAndResource(roleId, resourceId) {
    const permission = await this.permPersistPort.findPermissionByRoleAndResource(roleId, resourceId);
    if (!permission) throw new Error('Permission not found');
    return permission;
  }

  async createPermission(permissionData) {
    const newPermission = new Permission(
      permissionData.roleId,
      permissionData.resourceId,
      permissionData.actions
    );
    await this.permPersistPort.savePermission(newPermission);
    return newPermission;
  }

  async deletePermission(roleId, resourceId) {
    const permission = await this.getPermissionByRoleAndResource(roleId, resourceId);
    if (!permission) throw new Error('Permission not found');
    await this.permPersistPort.deletePermission(roleId, resourceId);
  }

  // Policy Methods
  async getPolicyById(policyId) {
    const policy = await this.permPersistPort.findPolicyById(policyId);
    if (!policy) throw new Error('Policy not found');
    return policy;
  }

  async createPolicy(policyData) {
    const newPolicy = new Policy(
      policyData.id,
      policyData.name,
      policyData.description,
      policyData.permissions
    );
    await this.permPersistPort.savePolicy(newPolicy);
    return newPolicy;
  }

  async deletePolicy(policyId) {
    const policy = await this.getPolicyById(policyId);
    if (!policy) throw new Error('Policy not found');
    await this.permPersistPort.deletePolicy(policyId);
  }

  async getAllPolicies() {
    return await this.permPersistPort.findAllPolicies();
  }
}

module.exports = PermService;
