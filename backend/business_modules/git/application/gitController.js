// gitController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function gitController(fastify, options) {


fastify.decorate('fetchRepo', async (request, reply) => {
    try {
      const { owner, repo } = request.params;
      const userId = request.user.id;
      const headerValue = request.headers['x-correlation-id'];
      const correlationId = (
        typeof headerValue === 'string' && headerValue.trim()
      )
      ? headerValue
      : `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      fastify.log.info(`Processing fetchRepo HTTP request for user: ${userId}, owner: ${owner}, repo: ${repo}`);
      
      // Check if diScope exists
      if (!request.diScope) {
        fastify.log.error('diScope not found in request object');
        throw new Error('Dependency injection scope not available');
      }

      fastify.log.info('Attempting to resolve gitService from DI container...');
      const gitService = await request.diScope.resolve('gitService');
      
      if (!gitService) {
        fastify.log.error('Git service not found in DI container');
        throw new Error('Git service not found in DI container');
      }

      fastify.log.info('gitService resolved successfully');

      const repoInGithubFormat = repo.includes('/') ? repo : `${owner}/${repo}`;
      fastify.log.info(`Calling gitService.fetchRepo with: userId=${userId}, repo=${repoInGithubFormat}, correlationId=${correlationId}`);
      
      try {
        const repository = await gitService.fetchRepo(userId, repoInGithubFormat, correlationId);
        fastify.log.info(`Repository fetched successfully`);
        return repository;
      } catch (serviceError) {
        fastify.log.error('Error from gitService.fetchRepo:', {
          message: serviceError.message,
          stack: serviceError.stack,
          name: serviceError.name,
          code: serviceError.code,
          status: serviceError.status,
          statusCode: serviceError.statusCode
        });
        throw serviceError;
      }
      
    } catch (error) {
      fastify.log.error('Error in fetchRepo controller:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        cause: error.cause
      });
      throw fastify.httpErrors.internalServerError('Failed to fetch repository', { cause: error });
    }
  });

  fastify.decorate('fetchDocs', async (request, reply) => {
    try {
      const { repoId } = request.query;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      const headerValue = request.headers['x-correlation-id'];
      const correlationId = (
        typeof headerValue === 'string' && headerValue.trim()
      )
    ? headerValue
    : `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      fastify.log.info(`Processing fetchDocs HTTP request for user: ${userId}, repo: ${repoId}`);
      
      const gitService = await request.diScope.resolve('gitService');
      if (!gitService) {
        throw new Error('Git service not found in DI container');
      }
      
      const docs = await gitService.fetchDocs(userId, repoId, correlationId);
      
      fastify.log.info(`Docs fetched via HTTP: ${JSON.stringify(docs)}`);
      return docs;
    } catch (error) {
      fastify.log.error('Error fetching docs:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch docs', { cause: error });
    }
  });

  fastify.decorate('persistRepo', async (request, reply) => {
    try {
      const { owner, repo } = request.params;
      const { branch = 'main', forceUpdate = false, includeHistory = true } = request.body || {};
      const userId = request.user.id;
      const headerValue = request.headers['x-correlation-id'];
      const correlationId = (
        typeof headerValue === 'string' && headerValue.trim()
      )
      ? headerValue
      : `http-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      fastify.log.info(`Processing persistRepo HTTP request for user: ${userId}, owner: ${owner}, repo: ${repo}, branch: ${branch}`);
      
      // Check if diScope exists
      if (!request.diScope) {
        fastify.log.error('diScope not found in request object');
        throw new Error('Dependency injection scope not available');
      }

      fastify.log.info('Attempting to resolve gitService from DI container...');
      const gitService = await request.diScope.resolve('gitService');
      
      if (!gitService) {
        fastify.log.error('Git service not found in DI container');
        throw new Error('Git service not found in DI container');
      }

      fastify.log.info('gitService resolved successfully');

      const repoInGithubFormat = repo.includes('/') ? repo : `${owner}/${repo}`;
      fastify.log.info(`Calling gitService.persistRepo with: userId=${userId}, repo=${repoInGithubFormat}, branch=${branch}, forceUpdate=${forceUpdate}, correlationId=${correlationId}`);
      
      try {
        const result = await gitService.persistRepo(userId, repoInGithubFormat, branch, { forceUpdate, includeHistory, correlationId });
        fastify.log.info(`Repository persisted successfully: ${JSON.stringify(result)}`);
        return result;
      } catch (serviceError) {
        fastify.log.error('Error from gitService.persistRepo:', {
          message: serviceError.message,
          stack: serviceError.stack,
          name: serviceError.name,
          code: serviceError.code,
          status: serviceError.status,
          statusCode: serviceError.statusCode
        });
        throw serviceError;
      }
      
    } catch (error) {
      fastify.log.error('Error in persistRepo controller:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        cause: error.cause
      });
      throw fastify.httpErrors.internalServerError('Failed to persist repository', { cause: error });
    }
  });
}

module.exports = fp(gitController);