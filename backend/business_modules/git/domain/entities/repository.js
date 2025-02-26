// repository.js
'use strict';

const { v4: uuidv4 } = require('uuid');
// const IGitPersistPort = require('../ports/IGitPersistPort');

class Repository {
  constructor(url) {
    this.repositoryId = uuidv4();
    this.url = url;
  }

  async fetchRepository(gitPersistPort) {
    const data = await gitPersistPort.fetchRepository(this.repositoryId);
    console.log(`Repository fetched: ${this.repositoryId}`);
    return data; 
  }

  async analyzeRepository(gitPersistPort) {
    const analysisResult = await gitPersistPort.analyzeRepository(this.repositoryId);
    console.log(`Repository analyzed: ${this.repositoryId}`);
    return analysisResult;
  }
}

module.exports = Repository;
