// repository.js
'use strict';

class Repository {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchRepo(repoId, IGitPort) {
    const data = await IGitPort.fetchRepo(this.userId, repoId);
    console.log(`Repository fetched: ${repoId}`);
    return data; 
  }

}

module.exports = Repository;
