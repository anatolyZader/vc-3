// gitController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function gitController(fastify, options) {
  let gitService;
  try {
    gitService = await fastify.diContainer.resolve('gitService');
  } catch (error) {
    fastify.log.error('Error resolving gitService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve gitService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  fastify.decorate('fetchRepo', async (userId, repoId) => {
    try {
      const repository = await gitService.fetchRepo(userId, repoId);
      return repository;
    } catch (error) {
      fastify.log.error('Error fetching repository:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch repository', { cause: error });
    }
  });

  fastify.decorate('fetchWiki', async (userId, repoId) => {
    try {
      const wiki = await gitService.fetchWiki(userId, repoId);
      return wiki;
    } catch (error) {
      fastify.log.error('Error fetching wiki:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch wiki', { cause: error });
    }
  });
}

module.exports = fp(gitController);
