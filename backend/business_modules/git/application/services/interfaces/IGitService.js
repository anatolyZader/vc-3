'use strict';
/* eslint-disable no-unused-vars */

class IGitService {
  constructor() {
    if (new.target === IGitService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async fetchRepository(repositoryId, IGitGitPort) {
    throw new Error('Method not implemented.');
  }

  async analyzeRepository(repositoryId, IGitAIPort) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IGitService;
