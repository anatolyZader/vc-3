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

    async persistWiki(userId, repoId, wiki) {
    throw new Error('Method not implemented.');
    }
}

module.exports = IGitPersistPort;
