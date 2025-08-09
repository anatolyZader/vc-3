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

  async fetchWiki(repoIdRaw, IGitPort) {
    const repoId = new RepoId(repoIdRaw);
    const data = await IGitPort.fetchWiki(this.userId.value, repoId.value);
    console.log(`Wiki fetched for repository: ${repoId.value}`);
    return data;
  }
}

module.exports = Repository;
