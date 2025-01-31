// gitProject.js 
'use strict';

const { v4: uuidv4 } = require('uuid');
// You may import your port interface if you want to type-check or reference it,
// but it’s optional to do so here. e.g.:
// const IGitPersistPort = require('../ports/IGitPersistPort');

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

  async addRepository(repositoryId, gitPersistPort) {
    // Update in-memory
    if (!this.repositories.includes(repositoryId)) {
      this.repositories.push(repositoryId);
    }
    // Persist relationship
    await gitPersistPort.addRepositoryToProject(this.projectId, repositoryId);
    console.log(`Repository ${repositoryId} added to project ${this.projectId}`);
  }

  async removeRepository(repositoryId, gitPersistPort) {
    this.repositories = this.repositories.filter(id => id !== repositoryId);
    await gitPersistPort.removeRepositoryFromProject(this.projectId, repositoryId);
    console.log(`Repository ${repositoryId} removed from project ${this.projectId}`);
  }

  async addDescription(description, gitPersistPort) {
    this.description = description;
    await gitPersistPort.updateProjectDescription(this.projectId, this.description);
    console.log(`Description added to project ${this.projectId}`);
  }

  async editDescription(description, gitPersistPort) {
    this.description = description;
    await gitPersistPort.updateProjectDescription(this.projectId, this.description);
    console.log(`Description updated for project ${this.projectId}`);
  }
}

module.exports = GitProject;
