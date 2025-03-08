'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');

class GitService extends IGitService {

  constructor(gitMessagingAdapter, gitGitAdapter) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter;
    this.gitGitAdapter = gitGitAdapter;
  }

  // Fetch a repository’s data and publish an event
  async fetchRepo(userId, repoId) {
    const repository = new Repository(userId);
    const result = await repository.fetchRepo(repoId, this.gitGitAdapter);

    // // Publish a "repositoryFetched" event
    // try {
    //   await this.gitMessagingAdapter.sendQuestion({
    //     prompt: {
    //       event: 'repositoryFetched',
    //       userId,
    //       repoId,
    //       data: result
    //     }
    //   });
    // } catch (error) {
    //   console.error('Error publishing repository fetched event:', error);
    // }
    return result;
  }

 
}

module.exports = GitService;
