class Permission {
    constructor(roleId, resourceId, actions) {
      this.roleId = roleId;
      this.resourceId = resourceId;
      this.actions = actions; 
    }
  
    // Domain method to check if a permission allows a specific action
    isAllowed(action) {
      return this.actions.includes(action);
    }
  
    // Domain method to add an action to the permission
    addAction(action) {
      if (!this.actions.includes(action)) {
        this.actions.push(action);
      }
    }
  
    // Domain method to remove an action from the permission
    removeAction(action) {
      this.actions = this.actions.filter(a => a !== action);
    }
  }
  
  module.exports = Permission;