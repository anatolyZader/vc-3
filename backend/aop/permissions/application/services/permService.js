// services/permService.js

const Role = require('../../domain/entities/role');
const Resource = require('../../domain/entities/resource');
const Permission = require('../../domain/entities/permission');
const Policy = require('../../domain/entities/policy');
const PermPostgresAdapter = require("../../infrastructure/persistence/permPostgresAdapter"); 

class PermService {
  constructor() { 
    this.permPostgresAdapter = PermPostgresAdapter;
  }

  // Role Methods
  async getRoleById(roleId) {
    const role = await this.permPostgresAdapter.findRoleById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }

  async createRole(roleData) {
    const newRole = new Role(roleData.id, roleData.name, roleData.description);
    await this.permPostgresAdapter.saveRole(newRole);
    return newRole;
  }

  async updateRole(roleId, roleData) {
    const role = await this.getRoleById(roleId);
    role.rename(roleData.name);
    role.updateDescription(roleData.description);
    await this.permPostgresAdapter.saveRole(role);
    return role;
  }

  // Resource Methods
  async getResourceById(resourceId) {
    const resource = await this.permPostgresAdapter.findResourceById(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }
    return resource;
  }

  async createResource(resourceData) {
    const newResource = new Resource(resourceData.id, resourceData.name, resourceData.type);
    await this.permPostgresAdapter.saveResource(newResource);
    return newResource;
  }

  // Permission Methods
  async getPermissionByRoleAndResource(roleId, resourceId) {
    const permission = await this.permPostgresAdapter.findPermissionByRoleAndResource(roleId, resourceId);
    if (!permission) {
      throw new Error('Permission not found');
    }
    return permission;
  }

  async createPermission(permissionData) {
    const newPermission = new Permission(permissionData.roleId, permissionData.resourceId, permissionData.actions);
    await this.permPostgresAdapter.savePermission(newPermission);
    return newPermission;
  }

  // Policy Methods
  async getPolicyById(policyId) {
    const policy = await this.permPostgresAdapter.findPolicyById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }
    return policy;
  }

  async createPolicy(policyData) {
    const newPolicy = new Policy(policyData.id, policyData.name, policyData.description, policyData.permissions);
    await this.permPostgresAdapter.savePolicy(newPolicy);
    return newPolicy;
  }


  async checkPermission(userId, resourceId, action) {
    // Get user role using permPostgresAdapter (assuming it has this functionality now)
    const userRole = await this.permPostgresAdapter.getUserRole(userId); 
    const policy = await this.permPostgresAdapter.findPolicyForResource(resourceId);

    if (policy && policy.isAllowed(userRole.id, resourceId, action)) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = PermService;