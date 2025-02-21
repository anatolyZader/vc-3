'use strict';
/* eslint-disable no-unused-vars */

const GitProject = require('../../domain/aggregates/gitProject');
const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');
const pubsubTopics = require('../../../messaging/pubsub/gitPubsubTopics');

class GitService extends IGitService {

  constructor(gitPersistAdapter, gitPubsubAdapter) {
    super();
    this.gitPersistAdapter = gitPersistAdapter;
    this.gitPubsubAdapter = gitPubsubAdapter;
  }

  // Fetch a list of projects
  async fetchProjectList(userId) {
    return await this.gitPersistAdapter.fetchProjects(userId);
  }

  // Create a new project
  async createProject(userId, title) {
    const project = new GitProject(userId, title);
    await project.create(this.gitPersistAdapter);

    // Publish project created event.
    await this.gitPubsubAdapter.publish(pubsubTopics.PROJECT_CREATED, {
      projectId: project.projectId,
      userId,
      title,
    });

    return project.projectId;
  }

  // Fetch an existing project
  async fetchProject(userId, projectId) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    return await project.fetch(projectId, this.gitPersistAdapter);
  }

  // Rename a project
  async renameProject(userId, projectId, newTitle) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.rename(newTitle, this.gitPersistAdapter);

    // Publish project renamed event.
    await this.gitPubsubAdapter.publish(pubsubTopics.PROJECT_RENAMED, {
      projectId,
      userId,
      newTitle,
    });
  }

  // Delete a project
  async deleteProject(userId, projectId) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.delete(this.gitPersistAdapter);

    // Publish project deleted event.
    await this.gitPubsubAdapter.publish(pubsubTopics.PROJECT_DELETED, {
      projectId,
      userId,
    });
  }

  // Add a new repository to a project
  async addRepository(userId, projectId, repositoryUrl) {
    const repository = new Repository(repositoryUrl);
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.addRepository(repository.repositoryId, this.gitPersistAdapter);

    // Publish repository added event.
    await this.gitPubsubAdapter.publish(pubsubTopics.REPOSITORY_ADDED, {
      repositoryId: repository.repositoryId,
      projectId,
      userId,
      repositoryUrl,
    });

    return repository.repositoryId;
  }

  // Remove a repository from a project
  async removeRepository(userId, projectId, repositoryId) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.removeRepository(repositoryId, this.gitPersistAdapter);

    // Publish repository removed event.
    await this.gitPubsubAdapter.publish(pubsubTopics.REPOSITORY_REMOVED, {
      repositoryId,
      projectId,
      userId,
    });
  }

  // Fetch a repository’s data
  async fetchRepository(userId, repositoryId) {
    const repository = new Repository(userId);
    repository.repositoryId = repositoryId;
    return await repository.fetchRepository(this.gitPersistAdapter);
  }

  // Analyze a repository
  async analyzeRepository(userId, repositoryId) {
    const repository = new Repository('');
    repository.repositoryId = repositoryId;
    return await repository.analyzeRepository(this.gitPersistAdapter);
  }
}

module.exports = GitService;
