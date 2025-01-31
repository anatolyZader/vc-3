'use strict';
/* eslint-disable no-unused-vars */

const GitProject = require('../../domain/gitProject');
const Repository = require('../../domain/repository');
const IGitService = require('./interfaces/IGitService');

// Removed TargetModule import

class GitService extends IGitService {
  constructor(gitPersistAdapter) {
    super();
    this.gitPersistAdapter = gitPersistAdapter;
  }

  // fetch a list of projects
  async fetchProjectList(userId, gitPersistAdapter) {
    return await gitPersistAdapter.fetchProjects(userId);
  }

  // Create a new project
  async createProject(userId, title, gitPersistAdapter) {
    const project = new GitProject(userId, title);
    await project.create(gitPersistAdapter);
    return project.projectId;
  }

  // Fetch an existing project
  async fetchProject(userId, projectId, gitPersistAdapter) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    return await project.fetch(projectId, gitPersistAdapter);
  }

  // Rename a project
  async renameProject(userId, projectId, newTitle, gitPersistAdapter) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.rename(newTitle, gitPersistAdapter);
  }

  // Delete a project
  async deleteProject(userId, projectId, gitPersistAdapter) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.delete(gitPersistAdapter);
  }

  // Add a new repository to a project
  async addRepository(userId, projectId, repositoryUrl, gitPersistAdapter) {
    const repository = new Repository(repositoryUrl);
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.addRepository(repository.repositoryId, gitPersistAdapter);
    return repository.repositoryId;
  }

  // Remove a repository from a project
  async removeRepository(userId, projectId, repositoryId, gitPersistAdapter) {
    const project = new GitProject(userId, '');
    project.projectId = projectId;
    await project.removeRepository(repositoryId, gitPersistAdapter);
  }

  // Fetch a repository’s data
  async fetchRepository(userId, repositoryId, gitPersistAdapter) {
    const repository = new Repository('');
    repository.repositoryId = repositoryId;
    return await repository.fetchRepository(gitPersistAdapter);
  }

  // Analyze a repository
  async analyzeRepository(userId, repositoryId, gitPersistAdapter) {
    const repository = new Repository('');
    repository.repositoryId = repositoryId;
    return await repository.analyzeRepository(gitPersistAdapter);
  }

}

module.exports = GitService;
