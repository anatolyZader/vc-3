'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');

class GitService extends IGitService {

  constructor(gitMessagingAdapter, gitGitAdapter, gitAIAdapter) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter;
    this.gitGitAdapter = gitGitAdapter;
    this.gitAIAdapter = gitAIAdapter;
  }

  // Fetch a repository’s data
  async fetchRepository(userId, repositoryId) {
    const repository = new Repository(userId);
    return await repository.fetchRepository(repositoryId, this.gitGitAdapter);
  }

  // Analyze a repository
  async analyzeRepository(userId, repositoryId) {
    const repository = new Repository(userId);
    return await repository.analyzeRepository(repositoryId, this.gitAIAdapter);
  }
}

module.exports = GitService;
