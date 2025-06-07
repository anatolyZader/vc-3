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

  async fetchWiki(repoId, IGitPort) {
    const data = await IGitPort.fetchWiki(this.userId, repoId);
    console.log(`Wiki fetched for repository: ${repoId}`);
    return data; 
  }

}

module.exports = Repository;
