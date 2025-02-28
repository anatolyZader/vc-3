// repository.js
'use strict';

class Repository {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchRepository(repositoryId, IGitGitPort) {
    const data = await IGitGitPort.fetchRepository(this.userId, repositoryId);
    console.log(`Repository fetched: ${repositoryId}`);
    return data; 
  }

  async analyzeRepository(repositoryId, IGitAIPort) {
    const analysisResult = await IGitAIPort.analyzeRepository(this.userId, repositoryId);
    console.log(`Repository analyzed: ${repositoryId}`);
    return analysisResult;
  }
}

module.exports = Repository;
