/* eslint-disable no-unused-vars */
// IPermPersistPort.js

class IPermPersistPort {
  constructor() {
    if (this.constructor === IPermPersistPort) {
      throw new Error('Abstract class IPermPersistPort cannot be instantiated directly.');
    }
  }

  // Role Methods
  async findRoleById(roleId) {
    throw new Error('Method not implemented: findRoleById(roleId)');
  }

  async saveRole(role) {
    throw new Error('Method not implemented: saveRole(role)');
  }

  async deleteRole(roleId) {
    throw new Error('Method not implemented: deleteRole(roleId)');
  }

  async findAllRoles() {
    throw new Error('Method not implemented: findAllRoles()');
  }

  // Resource Methods
  async findResourceById(resourceId) {
    throw new Error('Method not implemented: findResourceById(resourceId)');
  }

  async saveResource(resource) {
    throw new Error('Method not implemented: saveResource(resource)');
  }

  async deleteResource(resourceId) {
    throw new Error('Method not implemented: deleteResource(resourceId)');
  }

  // Permission Methods
  async findPermissionByRoleAndResource(roleId, resourceId) {
    throw new Error('Method not implemented: findPermissionByRoleAndResource(roleId, resourceId)');
  }

  async savePermission(permission) {
    throw new Error('Method not implemented: savePermission(permission)');
  }

  async deletePermission(roleId, resourceId) {
    throw new Error('Method not implemented: deletePermission(roleId, resourceId)');
  }

  // Policy Methods
  async findPolicyById(policyId) {
    throw new Error('Method not implemented: findPolicyById(policyId)');
  }

  async savePolicy(policy) {
    throw new Error('Method not implemented: savePolicy(policy)');
  }

  async deletePolicy(policyId) {
    throw new Error('Method not implemented: deletePolicy(policyId)');
  }

  async findAllPolicies() {
    throw new Error('Method not implemented: findAllPolicies()');
  }
}

module.exports = IPermPersistPort;
