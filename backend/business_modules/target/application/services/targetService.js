'use strict';
/* eslint-disable no-unused-vars */

const target = require('../../domain/entities/target');

class targetService {
  constructor(targetPersistAdapter) {
    this.targetPersistAdapter = targetPersistAdapter;
  }

  // Fetch a target module
  async fetchTarget(targetRepoId, ITargetGitPort) {
    const target = new target();
    return await target.fetchTarget(ITargetGitPort);
  }

  async analyzeTarget(targetRepoId, ITargetAIPort) {
    const target = new target();
    return await target.analyzeTarget(ITargetAIPort);
  }
}

module.exports = targetService;
