'use strict';
/* eslint-disable no-unused-vars */

class IGitService {
  constructor() {
    if (new.target === IGitService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async fetchProjectList(userId, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async createProject(userId, title, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async fetchProject(userId, projectId, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async renameProject(userId, projectId, newTitle, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async deleteProject(userId, projectId, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async addRepository(userId, projectId, repositoryUrl, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async removeRepository(userId, projectId, repositoryId, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async fetchRepository(userId, repositoryId, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }

  async analyzeRepository(userId, repositoryId, gitPersistAdapter) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IGitService;
