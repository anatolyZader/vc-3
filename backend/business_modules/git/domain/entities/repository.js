// repository.js
'use strict';

const UserId = require('../value_objects/userId');
const RepoId = require('../value_objects/repoId');

class Repository {
  constructor(userIdRaw) {
    // Accept already constructed UserId or raw value
    this.userId = userIdRaw instanceof UserId ? userIdRaw : new UserId(userIdRaw);
  }

  async fetchRepo(repoIdRaw, IGitPort) {
    const repoId = new RepoId(repoIdRaw);
    const data = await IGitPort.fetchRepo(this.userId.value, repoId.value);
    console.log(`Repository fetched: ${repoId.value}`);
    return data;
  }

  async fetchDocs(repoIdRaw, IGitPort) {
    const repoId = new RepoId(repoIdRaw);
    const data = await IGitPort.fetchDocs(this.userId.value, repoId.value);
    console.log(`Docs fetched for repository: ${repoId.value}`);
    return data;
  }

  async persistRepo(repoIdRaw, branch, IGitPort, options = {}) {
    const repoId = new RepoId(repoIdRaw);
    const data = await IGitPort.fetchRepo(this.userId.value, repoId.value);
    console.log(`Repository data prepared for persistence: ${repoId.value}, branch: ${branch}`);
    return data;
  }
}

module.exports = Repository;
