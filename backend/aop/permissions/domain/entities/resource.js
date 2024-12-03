// domain/entities/resource.js

class Resource {
    constructor(id, name, type) {
      this.id = id;
      this.name = name;
      this.type = type;
    }
  
    rename(newName) {
      this.name = newName;
    }
  
    changeType(newType) {
      this.type = newType;
    }
  }
  
  module.exports = Resource;