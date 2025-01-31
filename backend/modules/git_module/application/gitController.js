'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function gitController(fastify, options) {
  let gitService, gitPersistAdapter;

  // Resolve dependencies from the DI container
  try {
    gitService = await fastify.diContainer.resolve('gitService');
  } catch (error) {
    fastify.log.error('Error resolving gitService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve gitService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  try {
    gitPersistAdapter = await fastify.diContainer.resolve('gitPersistAdapter');
  } catch (error) {
    fastify.log.error('Error resolving gitPersistAdapter:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve gitPersistAdapter.',
      { cause: error }
    );
  }

  /**
   * Create a new project
   * POST /project
   */
  fastify.decorate('createProject', async function (request, reply) {
    const { userId, title } = request.body;
    try {
      const projectId = await gitService.createProject(userId, title, gitPersistAdapter);
      return reply.status(201).send({
        message: 'Project created successfully',
        projectId
      });
    } catch (error) {
      fastify.log.error('Error creating project:', error);
      return reply.internalServerError('Failed to create project', { cause: error });
    }
  });

  /**
   * Fetch a list of projects
   * GET /projects?userId=...
   */
  fastify.decorate('fetchProjectList', async function (request, reply) {
    const { userId } = request.query;
    try {
      const projectList = await gitService.fetchProjectList(userId, gitPersistAdapter);
      return reply.status(200).send(projectList);
    } catch (error) {
      fastify.log.error('Error fetching project list:', error);
      return reply.internalServerError('Failed to fetch project list', { cause: error });
    }
  });

  /**
   * Fetch a specific project
   * GET /project/:projectId?userId=...
   */
  fastify.decorate('fetchProject', async function (request, reply) {
    const { projectId } = request.params;
    const { userId } = request.query;
    try {
      const project = await gitService.fetchProject(userId, projectId, gitPersistAdapter);
      return reply.status(200).send(project);
    } catch (error) {
      fastify.log.error('Error fetching project:', error);
      return reply.internalServerError('Failed to fetch project', { cause: error });
    }
  });

  /**
   * Rename a project
   * PATCH /project/:projectId/rename
   */
  fastify.decorate('renameProject', async function (request, reply) {
    const { projectId } = request.params;
    const { userId, newTitle } = request.body;
    try {
      await gitService.renameProject(userId, projectId, newTitle, gitPersistAdapter);
      return reply.status(200).send({ message: 'Project renamed successfully' });
    } catch (error) {
      fastify.log.error('Error renaming project:', error);
      return reply.internalServerError('Failed to rename project', { cause: error });
    }
  });

  /**
   * Delete a project
   * DELETE /project/:projectId
   */
  fastify.decorate('deleteProject', async function (request, reply) {
    const { projectId } = request.params;
    const { userId } = request.body;
    try {
      await gitService.deleteProject(userId, projectId, gitPersistAdapter);
      return reply.status(200).send({ message: 'Project deleted successfully' });
    } catch (error) {
      fastify.log.error('Error deleting project:', error);
      return reply.internalServerError('Failed to delete project', { cause: error });
    }
  });

  /**
   * Add a repository to a project
   * POST /project/:projectId/repository
   */
  fastify.decorate('addRepository', async function (request, reply) {
    const { projectId } = request.params;
    const { userId, repositoryUrl } = request.body;
    try {
      const repositoryId = await gitService.addRepository(
        userId,
        projectId,
        repositoryUrl,
        gitPersistAdapter
      );
      return reply.status(201).send({
        message: 'Repository added successfully',
        repositoryId
      });
    } catch (error) {
      fastify.log.error('Error adding repository:', error);
      return reply.internalServerError('Failed to add repository', { cause: error });
    }
  });

  /**
   * Remove a repository from a project
   * DELETE /project/:projectId/repository
   */
  fastify.decorate('removeRepository', async function (request, reply) {
    const { projectId } = request.params;
    const { userId, repositoryId } = request.body;
    try {
      await gitService.removeRepository(userId, projectId, repositoryId, gitPersistAdapter);
      return reply.status(200).send({ message: 'Repository removed successfully' });
    } catch (error) {
      fastify.log.error('Error removing repository:', error);
      return reply.internalServerError('Failed to remove repository', { cause: error });
    }
  });

  /**
   * Fetch a repository by ID
   * GET /repository/:repositoryId?userId=...
   */
  fastify.decorate('fetchRepository', async function (request, reply) {
    const { repositoryId } = request.params;
    const { userId } = request.query;
    try {
      const repository = await gitService.fetchRepository(userId, repositoryId, gitPersistAdapter);
      return reply.status(200).send(repository);
    } catch (error) {
      fastify.log.error('Error fetching repository:', error);
      return reply.internalServerError('Failed to fetch repository', { cause: error });
    }
  });

  /**
   * Analyze a repository
   * POST /repository/:repositoryId/analyze
   */
  fastify.decorate('analyzeRepository', async function (request, reply) {
    const { repositoryId } = request.params;
    const { userId } = request.body;
    try {
      const analysis = await gitService.analyzeRepository(userId, repositoryId, gitPersistAdapter);
      return reply.status(200).send({
        message: 'Repository analyzed successfully',
        analysis
      });
    } catch (error) {
      fastify.log.error('Error analyzing repository:', error);
      return reply.internalServerError('Failed to analyze repository', { cause: error });
    }
  });

  // NOTE: No targetModule route here.
}

module.exports = fp(gitController);
