// policy represents a collection of permissions that define access control rules for your application. It acts as a container for multiple Permission objects, each specifying allowed actions for a particular role on a specific resource.

class Policy {
    constructor(id, name, description, permissions = []) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.permissions = permissions; // Array of Permission objects
    }
  
    // Domain method to add a permission to the policy
    addPermission(permission) {
      this.permissions.push(permission);
    }
  
    // Domain method to remove a permission from the policy
    removePermission(permission) {
      this.permissions = this.permissions.filter(p => 
        !(p.roleId === permission.roleId && p.resourceId === permission.resourceId)
      );
    }
  
    // Domain method to check if a policy allows an action on a resource for a given role
    isAllowed(roleId, resourceId, action) {
      const permission = this.permissions.find(p => 
        p.roleId === roleId && p.resourceId === resourceId
      );
      return permission ? permission.isAllowed(action) : false;
    }
  }
  
  module.exports = Policy;