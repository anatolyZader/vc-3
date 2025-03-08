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

  fastify.decorate('fetchRepo', async function (request, reply) {
    const { id: userId } = request.user;
    const { repoId } = request.params;
    try {
      const repository = await gitService.fetchRepo(userId, repoId);
      return reply.status(200).send(repository);
    } catch (error) {
      fastify.log.error('Error fetching repository:', error);
      return reply.internalServerError('Failed to fetch repository', { cause: error });
    }
  });


}

module.exports = fp(gitController);
