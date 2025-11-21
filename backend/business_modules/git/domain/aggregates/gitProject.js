// gitProject.js 
'use strict';

const UserId = require('../value_objects/userId');
const RepoId = require('../value_objects/repoId');
const ProjectId = require('../value_objects/projectId');
const ProjectCreatedEvent = require('../events/projectCreatedEvent');
const ProjectRenamedEvent = require('../events/projectRenamedEvent');
const RepositoryAddedToProjectEvent = require('../events/repositoryAddedToProjectEvent');
const RepositoryRemovedFromProjectEvent = require('../events/repositoryRemovedFromProjectEvent');

class GitProject {
  constructor(userIdRaw, title) {
    this.userId = new UserId(userIdRaw);
    this.projectId = new ProjectId(require('uuid').v4());
    this.title = title;
    this.repositories = [];
  }

  async create(gitPersistPort, messagingAdapter) {
    const newProjectData = {
      projectId: this.projectId.value,
      title: this.title,
      createdAt: new Date()
    };
    await gitPersistPort.createProject(this.userId.value, newProjectData);
    // Publish domain event
    const event = new ProjectCreatedEvent({ userId: this.userId.value, projectId: this.projectId.value, title: this.title });
    if (messagingAdapter) await messagingAdapter.publishProjectCreatedEvent(event);
    console.log(`GitProject ${this.projectId.value} created for user ${this.userId.value}.`);
  }

  async rename(newTitle, gitPersistPort, messagingAdapter) {
    this.title = newTitle;
    await gitPersistPort.renameProject(this.projectId.value, this.title);
    // Publish domain event
    const event = new ProjectRenamedEvent({ userId: this.userId.value, projectId: this.projectId.value, newTitle });
    if (messagingAdapter) await messagingAdapter.publishProjectRenamedEvent(event);
    console.log(`GitProject renamed to: ${this.title}`);
  }

  async addRepository(repoIdRaw, gitPersistPort, messagingAdapter) {
    const repoId = new RepoId(repoIdRaw);
    if (!this.repositories.includes(repoId.value)) {
      this.repositories.push(repoId.value);
    }
    await gitPersistPort.addRepositoryToProject(this.projectId.value, repoId.value);
    // Publish domain event
    const event = new RepositoryAddedToProjectEvent({ userId: this.userId.value, projectId: this.projectId.value, repoId: repoId.value });
    if (messagingAdapter) await messagingAdapter.publishRepositoryAddedToProjectEvent(event);
    console.log(`Repository ${repoId.value} added to project ${this.projectId.value}`);
  }

  async removeRepository(repoIdRaw, gitPersistPort, messagingAdapter) {
    const repoId = new RepoId(repoIdRaw);
    this.repositories = this.repositories.filter(id => id !== repoId.value);
    await gitPersistPort.removeRepositoryFromProject(this.projectId.value, repoId.value);
    // Publish domain event
    const event = new RepositoryRemovedFromProjectEvent({ userId: this.userId.value, projectId: this.projectId.value, repoId: repoId.value });
    if (messagingAdapter) await messagingAdapter.publishRepositoryRemovedFromProjectEvent(event);
    console.log(`Repository ${repoId.value} removed from project ${this.projectId.value}`);
  }
}

module.exports = GitProject;
