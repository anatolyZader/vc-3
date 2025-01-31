'use strict';

const { v4: uuidv4 } = require('uuid');

class TargetCode {
  constructor(path) {
    this.moduleId = uuidv4();
    this.path = path;
  }

  async fetchTargetCode(targetCodePersistPort) {
    const data = await targetCodePersistPort.fetchTargetCode(this.moduleId);
    console.log(`TargetCode fetched: ${this.moduleId}`);
    return data;
  }
}

module.exports = TargetCode;
