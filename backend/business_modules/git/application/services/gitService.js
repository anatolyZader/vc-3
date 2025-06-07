// gitService.js
'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');

class GitService extends IGitService {
  constructor({gitMessagingAdapter, gitAdapter, gitPersistenceAdapter}) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter;  
    this.gitAdapter = gitAdapter;
    this.gitPersistenceAdapter = gitPersistenceAdapter;  
  }

  async fetchRepo(userId, repoId) {
    const repository = new Repository(userId);
    const result = await repository.fetchRepo(repoId, this.gitAdapter);
    await this.gitMessagingAdapter.publishRepoFetchedEvent(result);
    await this.gitPersistenceAdapter.persistFetchedRepo(result);
    return result;
  }

  async fetchWiki(userId, repoId) {
    const repository = new Repository(userId);
    const result = await repository.fetchWiki(repoId, this.gitAdapter);
    await this.gitMessagingAdapter.publishWikiFetchedEvent(result);
    await this.gitPersistenceAdapter.persistFetchedWiki(result);
    return result;
  }
}

module.exports = GitService;
