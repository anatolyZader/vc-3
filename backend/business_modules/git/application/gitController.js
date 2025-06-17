// gitController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function gitController(fastify, options) {

  // HTTP route handlers - extract params from request
  fastify.decorate('fetchRepo', async (request, reply) => {
    try {
      const { repoId } = request.params;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      fastify.log.info(`Processing fetchRepo HTTP request for user: ${userId}, repo: ${repoId}`);
      
      const gitService = await request.diScope.resolve('gitService');
      if (!gitService) {
        throw new Error('Git service not found in DI container');
      }
      
      const repository = await gitService.fetchRepo(userId, repoId);
      
      fastify.log.info(`Repository fetched via HTTP: ${JSON.stringify(repository)}`);
      return repository;
    } catch (error) {
      fastify.log.error('Error fetching repository:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch repository', { cause: error });
    }
  });

  fastify.decorate('fetchWiki', async (request, reply) => {
    try {
      const { repoId } = request.params;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      fastify.log.info(`Processing fetchWiki HTTP request for user: ${userId}, repo: ${repoId}`);
      
      const gitService = await request.diScope.resolve('gitService');
      if (!gitService) {
        throw new Error('Git service not found in DI container');
      }
      
      const wiki = await gitService.fetchWiki(userId, repoId);
      
      fastify.log.info(`Wiki fetched via HTTP: ${JSON.stringify(wiki)}`);
      return wiki;
    } catch (error) {
      fastify.log.error('Error fetching wiki:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch wiki', { cause: error });
    }
  });
}

module.exports = fp(gitController);