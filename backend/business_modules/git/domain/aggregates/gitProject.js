// gitProject.js 
'use strict';

const { v4: uuidv4 } = require('uuid');

class GitProject {
  constructor(userId, title) {
    this.userId = userId;
    this.projectId = uuidv4();
    this.title = title;
    this.repositories = [];
  }

  async create(gitPersistPort) {
    const newProjectData = {
      projectId: this.projectId,
      title: this.title,
      createdAt: new Date()
    };
    await gitPersistPort.createProject(this.userId, newProjectData);
    console.log(`GitProject ${this.projectId} created for user ${this.userId}.`);
  }

  async rename(newTitle, gitPersistPort) {
    this.title = newTitle;
    await gitPersistPort.renameProject(this.projectId, this.title);
    console.log(`GitProject renamed to: ${this.title}`);
  }

  async addRepository(repoId, gitPersistPort) {
    // Update in-memory
    if (!this.repositories.includes(repoId)) {
      this.repositories.push(repoId);
    }
    // Persist relationship
    await gitPersistPort.addRepositoryToProject(this.projectId, repoId);
    console.log(`Repository ${repoId} added to project ${this.projectId}`);
  }

  async removeRepository(repoId, gitPersistPort) {
    this.repositories = this.repositories.filter(id => id !== repoId);
    await gitPersistPort.removeRepositoryFromProject(this.projectId, repoId);
    console.log(`Repository ${repoId} removed from project ${this.projectId}`);
  }
}

module.exports = GitProject;
