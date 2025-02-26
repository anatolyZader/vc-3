'use strict';
/* eslint-disable no-unused-vars */

class IGitPersistPort {
  constructor() {
    if (new.target === IGitPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // // Fetches a list of Git projects.
  // async fetchProjects(userId) {
  //   throw new Error('Method not implemented.');
  // }

  // // Creates a new Git project.
  // async createProject(userId, projectData) {
  //   throw new Error('Method not implemented.');
  // }

  // // Renames an existing Git project.
  // async renameProject(projectId, newTitle) {
  //   throw new Error('Method not implemented.');
  // }

  //     // You might add a direct fetch by ID for a single project if needed:
  // async fetchProjectById(projectId) {
  //   throw new Error('Method not implemented.');
  // }

  // // Delete a project
  // async deleteProject(userId, projectId) {
  //   throw new Error('Method not implemented.');
  // }

  // // Adds a repository reference to a Git project.
  // async addRepositoryToProject(projectId, repositoryId) {
  //   throw new Error('Method not implemented.');
  // }

  // // Removes a repository reference from a Git project.
  // async removeRepositoryFromProject(projectId, repositoryId) {
  //   throw new Error('Method not implemented.');
  // }

  // // Updates the project description.
  // async updateProjectDescription(projectId, description) {
  //   throw new Error('Method not implemented.');
  // }

  // Fetches data for an existing repository.
  async fetchRepository(repositoryId) {
    throw new Error('Method not implemented.');
  }

  // Analyzes an existing repository.
  async analyzeRepository(repositoryId) {
    throw new Error('Method not implemented.');
  }
}
module.exports = IGitPersistPort;
