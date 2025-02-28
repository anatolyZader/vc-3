// IGitAIPort.js
'use strict';
/* eslint-disable no-unused-vars */

class IGitAIPort {
  constructor() {
    if (new.target === IGitAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // Fetches data for an existing repository.
  async analyzeRepository(userId, repositoryId) {
    throw new Error('Method not implemented.');
  }

}
module.exports = IGitAIPort;
