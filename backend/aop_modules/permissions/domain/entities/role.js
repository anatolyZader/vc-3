class Role {
    constructor(id, name, description) {
      this.id = id;
      this.name = name;
      this.description = description;
    }
  
    // Domain method to rename the role
    rename(newName) {
      this.name = newName;
    }
  
    // Domain method to update the role's description
    updateDescription(newDescription) {
      this.description = newDescription;
    }
  }
  
  module.exports = Role;