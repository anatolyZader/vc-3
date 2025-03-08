// IGitGitPort.js
'use strict';
/* eslint-disable no-unused-vars */

class IGitGitPort {
  constructor() {
    if (new.target === IGitGitPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // Fetches data for an existing repository.
  async fetchRepo(userId, repoId) {
    throw new Error('Method not implemented.');
  }

}
module.exports = IGitGitPort;
