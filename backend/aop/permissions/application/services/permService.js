// services/permService.js

const Role = require('../../domain/entities/role');
const Resource = require('../../domain/entities/resource');
const Permission = require('../../domain/entities/permission');
const Policy = require('../../domain/entities/policy');
const PermPostgresAdapter = require("../../infrastructure/persistence/permPostgresAdapter")

class PermService {
  constructor({ permissionsRepository, iamAdapter }) {
    this.permissionsRepository = permissionsRepository;
    this.iamAdapter = iamAdapter;
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
    await this.permissionsRepository.saveRole(newRole);
    return newRole;
  }

  async updateRole(roleId, roleData) {
    const role = await this.getRoleById(roleId);
    role.rename(roleData.name);
    role.updateDescription(roleData.description);
    await this.permissionsRepository.saveRole(role);
    return role;
  }

  // Resource Methods
  async getResourceById(resourceId) {
    const resource = await this.permissionsRepository.findResourceById(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }
    return resource;
  }

  async createResource(resourceData) {
    const newResource = new Resource(resourceData.id, resourceData.name, resourceData.type);
    await this.permissionsRepository.saveResource(newResource);
    return newResource;
  }

  // Permission Methods
  async getPermissionByRoleAndResource(roleId, resourceId) {
    const permission = await this.permissionsRepository.findPermissionByRoleAndResource(roleId, resourceId);
    if (!permission) {
      throw new Error('Permission not found');
    }
    return permission;
  }

  async createPermission(permissionData) {
    const newPermission = new Permission(permissionData.roleId, permissionData.resourceId, permissionData.actions);
    await this.permissionsRepository.savePermission(newPermission);
    return newPermission;
  }

  // Policy Methods
  async getPolicyById(policyId) {
    const policy = await this.permissionsRepository.findPolicyById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }
    return policy;
  }

  async createPolicy(policyData) {
    const newPolicy = new Policy(policyData.id, policyData.name, policyData.description, policyData.permissions);
    await this.permissionsRepository.savePolicy(newPolicy);
    return newPolicy;
  }


  // Authorization Logic
  async checkPermission(userId, resourceId, action) {
    const userRole = await this.iamAdapter.getUserRole(userId);
    const policy = await this.permissionsRepository.findPolicyForResource(resourceId);
    if (policy && policy.isAllowed(userRole.id, resourceId, action)) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = PermService;