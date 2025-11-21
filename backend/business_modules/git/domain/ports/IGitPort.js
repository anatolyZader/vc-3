// IGitPort.js
'use strict';
/* eslint-disable no-unused-vars */

class IGitPort {
  constructor() {
    if (new.target === IGitPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // Fetches data for an existing repository.
  async fetchRepo(userId, repoId) {
    throw new Error('Method not implemented.');
  }

  // Fetches data for an existing repository's docs.  
  async fetchDocs(userId, repoId) {
    throw new Error('Method not implemented.');
  }

}
module.exports = IGitPort;
