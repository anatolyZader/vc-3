class IPermPersistPort {
    constructor() {
      if (new.target === IPermPersistPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
  
    async findRoleById(roleId) { 
      throw new Error("Method 'findRoleById(roleId)' must be implemented.");
    }
  
    async findResourceById(resourceId) {
      throw new Error("Method 'findResourceById(resourceId)' must be implemented.");
    }
  
    async findPermissionByRoleAndResource(roleId, resourceId) {
      throw new Error("Method 'findPermissionByRoleAndResource(roleId, resourceId)' must be implemented.");
    }
  
    async saveRole(role) {
      throw new Error("Method 'saveRole(role)' must be implemented.");
    }
  
    async saveResource(resource) {
      throw new Error("Method 'saveResource(resource)' must be implemented.");
    }
  
    async savePermission(permission) {
      throw new Error("Method 'savePermission(permission)' must be implemented.");
    }
  
    async findPolicyById(policyId) {
      throw new Error("Method 'findPolicyById(policyId)' must be implemented.");
    }
  
    async savePolicy(policy) {
      throw new Error("Method 'savePolicy(policy)' must be implemented.");
    }
  
    
  }
  
  module.exports = IPermPersistPort;