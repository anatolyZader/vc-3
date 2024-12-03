class Resource {
    constructor(id, name, type) {
      this.id = id;
      this.name = name;
      this.type = type;
    }
  
    // Domain method to rename the resource
    rename(newName) {
      this.name = newName;
    }
  }
  
  module.exports = Resource;