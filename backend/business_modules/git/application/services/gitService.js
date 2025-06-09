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
    const repo = await repository.fetchRepo(repoId, this.gitAdapter);
    await this.gitMessagingAdapter.publishRepoFetchedEvent(repo, correlationId);
    await this.gitPersistenceAdapter.persistFetchedRepo(userId, repoId, repo);
    return repo;
  }

  async fetchWiki(userId, repoId) {
    const repository = new Repository(userId);
    const wiki = await repository.fetchWiki(repoId, this.gitAdapter);
    await this.gitMessagingAdapter.publishWikiFetchedEvent(wiki, correlationId);
    await this.gitPersistenceAdapter.persistWiki(userId, repoId, wiki);
    return wiki;
  }
}

module.exports = GitService;
