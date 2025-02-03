'use strict';
/* eslint-disable no-unused-vars */

const GitProject = require('../../domain/aggregates/gitProject');
const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');

class GitService extends IGitService {
  constructor(gitPersistAdapter) {
    super();
    this.gitPersistAdapter = gitPersistAdapter;
  }

  // fetch a list of projects
  async fetchProjectList(userId) {
    return await this.gitPersistAdapter.fetchProjects(userId);
  }

  // Create a new project
  async createProject(userId, title) {
    const project = new GitProject(userId, title);
    await project.create(this.gitPersistAdapter);
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
  }

  // Delete a project
  async deleteProject(userId, projectId) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.delete(this.gitPersistAdapter);
  }

  // Add a new repository to a project
  async addRepository(userId, projectId, repositoryUrl) {
    const repository = new Repository(repositoryUrl);
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.addRepository(repository.repositoryId, this.gitPersistAdapter);
    return repository.repositoryId;
  }

  // Remove a repository from a project
  async removeRepository(userId, projectId, repositoryId) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.removeRepository(repositoryId, this.gitPersistAdapter);
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
