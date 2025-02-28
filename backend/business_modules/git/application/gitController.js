'use strict';
/* eslint-disable no-unused-vars */

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

  fastify.decorate('fetchRepository', async function (request, reply) {
    const { id: userId } = request.user;
    const { repositoryId } = request.params;
    try {
      const repository = await gitService.fetchRepository(userId, repositoryId);
      return reply.status(200).send(repository);
    } catch (error) {
      fastify.log.error('Error fetching repository:', error);
      return reply.internalServerError('Failed to fetch repository', { cause: error });
    }
  });

  fastify.decorate('analyzeRepository', async function (request, reply) {
    const { id: userId } = request.user;
    const { repositoryId } = request.params;
    try {
      const analysis = await gitService.analyzeRepository(userId, repositoryId);
      return reply.status(200).send({
        message: 'Repository analyzed successfully',
        analysis
      });
    } catch (error) {
      fastify.log.error('Error analyzing repository:', error);
      return reply.internalServerError('Failed to analyze repository', { cause: error });
    }
  });

}

module.exports = fp(gitController);
