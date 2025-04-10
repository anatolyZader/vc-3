'use strict';

const { v4: uuidv4 } = require('uuid');

class target {
  constructor(path) {
    this.moduleId = uuidv4();
    this.path = path;
  }

  async fetchtarget(targetPersistPort) {
    const data = await targetPersistPort.fetchtarget(this.moduleId);
    console.log(`target fetched: ${this.moduleId}`);
    return data;
  }
}

module.exports = target;
