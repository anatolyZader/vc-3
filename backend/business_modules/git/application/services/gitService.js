'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');

class GitService extends IGitService {
  constructor(gitMessagingAdapter, gitGitAdapter) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter; // now used for pubsub events
    this.gitGitAdapter = gitGitAdapter;
  }

  // Fetch a repository’s data and publish an event
  async fetchRepo(userId, repoId) {
    const repository = new Repository(userId);
    const result = await repository.fetchRepo(repoId, this.gitGitAdapter);
    await this.gitMessagingAdapter.publishRepoFetchedEvent(result);
    return result;

  }
}

module.exports = GitService;
