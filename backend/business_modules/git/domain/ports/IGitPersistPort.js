// IGitPersistPort.js
'use strict';
/* eslint-disable no-unused-vars */

class IGitPersistPort {
  constructor() {
    if (new.target === IGitPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

    async persistRepo(userId, repoId, repo) {    
        throw new Error('Method not implemented.');
    }

    async persistDocs(userId, repoId, docs) {
    throw new Error('Method not implemented.');
    }
}

module.exports = IGitPersistPort;
