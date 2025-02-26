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
    // Fetch the role from the persistence layer (adapter)
    const roleData = await this.permPersistPort.findRoleById(roleId);
    if (!roleData) throw new Error('Role not found');
    
    // Return the role domain entity with the data from the persistence layer
    const role = new Role(roleData.id, roleData.name, roleData.description);
    return role;
  }

  async createRole(roleData) {
    if (!roleData.id || !roleData.name) throw new Error('Role data is invalid');
    
    // Create the domain entity
    const role = new Role(roleData.id, roleData.name, roleData.description);
    
    // Save the role using the persistence adapter
    await this.permPersistPort.saveRole(role);

    // Return the created role
    return role;
  }

  async updateRole(roleId, roleData) {
    // Fetch the existing role from persistence
    const role = await this.getRoleById(roleId);
    
    // Update the role's properties if necessary
    if (roleData.name) role.rename(roleData.name);
    if (roleData.description) role.updateDescription(roleData.description);
    
    // Save the updated role using the persistence adapter
    await this.permPersistPort.saveRole(role);
    
    // Return the updated role
    return role;
  }

  async deleteRole(roleId) {
    const role = await this.getRoleById(roleId);
    if (!role) throw new Error('Role not found');
    
    // Delete the role from the persistence layer
    await this.permPersistPort.deleteRole(roleId);
  }

  async getAllRoles() {
    // Fetch all roles from the persistence layer
    const rolesData = await this.permPersistPort.findAllRoles();
    
    // Map the persistence data to role domain entities
    return rolesData.map(roleData => new Role(roleData.id, roleData.name, roleData.description));
  }

  // Resource Methods
  async getResourceById(resourceId) {
    // Fetch the resource from the persistence layer
    const resourceData = await this.permPersistPort.findResourceById(resourceId);
    if (!resourceData) throw new Error('Resource not found');
    
    // Return the resource domain entity
    return new Resource(resourceData.id, resourceData.name, resourceData.type);
  }

  async createResource(resourceData) {
    if (!resourceData.id || !resourceData.name || !resourceData.type) {
      throw new Error('Resource data is invalid');
    }
    
    // Create the resource domain entity
    const resource = new Resource(resourceData.id, resourceData.name, resourceData.type);
    
    // Save the resource using the persistence adapter
    await this.permPersistPort.saveResource(resource);
    
    // Return the created resource
    return resource;
  }

  async updateResource(resourceId, resourceData) {
    // Fetch the resource from persistence
    const resource = await this.getResourceById(resourceId);
    
    // Update resource properties if provided
    if (resourceData.name) resource.rename(resourceData.name);
    if (resourceData.type) resource.changeType(resourceData.type);
    
    // Save the updated resource using the persistence adapter
    await this.permPersistPort.saveResource(resource);
    
    // Return the updated resource
    return resource;
  }

  async deleteResource(resourceId) {
    const resource = await this.getResourceById(resourceId);
    if (!resource) throw new Error('Resource not found');
    
    // Delete the resource from the persistence layer
    await this.permPersistPort.deleteResource(resourceId);
  }

  // Permission Methods
  async getPermissionByRoleAndResource(roleId, resourceId) {
    // Fetch the permission from persistence layer
    const permissionData = await this.permPersistPort.findPermissionByRoleAndResource(roleId, resourceId);
    if (!permissionData) throw new Error('Permission not found');
    
    // Create the permission domain entity
    const permission = new Permission(permissionData.roleId, permissionData.resourceId, permissionData.actions);
    return permission;
  }

  async createPermission(permissionData) {
    // Create the permission domain entity
    const permission = new Permission(permissionData.roleId, permissionData.resourceId, permissionData.actions);
    
    // Save the permission using the persistence adapter
    await this.permPersistPort.savePermission(permission);
    
    // Return the created permission
    return permission;
  }

  async updatePermission(roleId, resourceId, permissionData) {
    // Fetch the existing permission from persistence
    const permission = await this.getPermissionByRoleAndResource(roleId, resourceId);
    
    // Update permission actions if necessary
    permission.addAction(permissionData.actions);
    
    // Save the updated permission using the persistence adapter
    await this.permPersistPort.savePermission(permission);
    
    // Return the updated permission
    return permission;
  }

  async deletePermission(roleId, resourceId) {
    // Fetch the permission from persistence
    const permission = await this.getPermissionByRoleAndResource(roleId, resourceId);
    if (!permission) throw new Error('Permission not found');
    
    // Delete the permission from the persistence layer
    await this.permPersistPort.deletePermission(roleId, resourceId);
  }

  // Policy Methods
  async getPolicyById(policyId) {
    // Fetch the policy from persistence
    const policyData = await this.permPersistPort.findPolicyById(policyId);
    if (!policyData) throw new Error('Policy not found');
    
    // Map policy data to a domain entity
    const policy = new Policy(policyData.id, policyData.name, policyData.description);
    
    // Fetch associated permissions and add them to the policy
    const permissions = await this.permPersistPort.findPermissionsByPolicyId(policyId);
    permissions.forEach(permissionData => {
      const permission = new Permission(permissionData.roleId, permissionData.resourceId, permissionData.actions);
      policy.addPermission(permission);
    });
    
    return policy;
  }

  async createPolicy(policyData) {
    // Create the policy domain entity
    const policy = new Policy(policyData.id, policyData.name, policyData.description, policyData.permissions);
    
    // Save the policy using the persistence adapter
    await this.permPersistPort.savePolicy(policy);
    
    // Return the created policy
    return policy;
  }

  async updatePolicy(policyId, policyData) {
    // Fetch the existing policy from persistence
    const policy = await this.getPolicyById(policyId);
    
    // Update the policy properties if needed
    if (policyData.name) policy.name = policyData.name;
    if (policyData.description) policy.description = policyData.description;
    
    // Save the updated policy using the persistence adapter
    await this.permPersistPort.savePolicy(policy);
    
    // Return the updated policy
    return policy;
  }

  async deletePolicy(policyId) {
    // Fetch the policy from persistence
    const policy = await this.getPolicyById(policyId);
    if (!policy) throw new Error('Policy not found');
    
    // Delete the policy using the persistence adapter
    await this.permPersistPort.deletePolicy(policyId);
  }

  async getAllPolicies() {
    // Fetch all policies from the persistence layer
    const policiesData = await this.permPersistPort.findAllPolicies();
    
    // Map the policies data to domain entities
    return policiesData.map(policyData => new Policy(policyData.id, policyData.name, policyData.description));
  }
}

module.exports = PermService;
