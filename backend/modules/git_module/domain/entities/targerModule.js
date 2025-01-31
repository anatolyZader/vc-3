// targetModule.js 
'use strict';

const { v4: uuidv4 } = require('uuid');
// const IGitPersistPort = require('../ports/IGitPersistPort');

class TargetModule {
  constructor(path) {
    this.moduleId = uuidv4();
    this.path = path;
  }

  async fetchTargetModule(gitPersistPort) {
    const data = await gitPersistPort.fetchTargetModule(this.moduleId);
    console.log(`TargetModule fetched: ${this.moduleId}`);
    return data;
  }
}

module.exports = TargetModule;
