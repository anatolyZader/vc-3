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

  // Fetch a repository’s data and publish an event
  async fetchRepository(userId, repositoryId) {
    const repository = new Repository(userId);
    const result = await repository.fetchRepository(repositoryId, this.gitGitAdapter);

    // Publish a "repositoryFetched" event
    try {
      await this.gitMessagingAdapter.sendQuestion({
        prompt: {
          event: 'repositoryFetched',
          userId,
          repositoryId,
          data: result
        }
      });
    } catch (error) {
      console.error('Error publishing repository fetched event:', error);
    }
    return result;
  }

  // Analyze a repository and publish an event
  async analyzeRepository(userId, repositoryId) {
    const repository = new Repository(userId);
    const analysis = await repository.analyzeRepository(repositoryId, this.gitAIAdapter);

    // Publish a "repositoryAnalyzed" event
    try {
      await this.gitMessagingAdapter.analyzeQuestion({
        prompt: {
          event: 'repositoryAnalyzed',
          userId,
          repositoryId,
          analysis
        }
      });
    } catch (error) {
      console.error('Error publishing repository analyzed event:', error);
    }
    return analysis;
  }
}

module.exports = GitService;
