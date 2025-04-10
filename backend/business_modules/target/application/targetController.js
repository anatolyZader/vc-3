'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function targetController(fastify, options) {
  let targetService, targetPersistAdapter;

  try {
    targetService = await fastify.diContainer.resolve('targetService');
  } catch (error) {
    fastify.log.error('Error resolving targetService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve targetService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  try {
    targetPersistAdapter = await fastify.diContainer.resolve('targetPersistAdapter');
  } catch (error) {
    fastify.log.error('Error resolving targetPersistAdapter:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve targetPersistAdapter.',
      { cause: error }
    );
  }

  fastify.decorate('fetchtarget', async function (request, reply) {
    const { moduleId } = request.params;
    try {
      const moduleData = await targetService.fetchtarget(moduleId, targetPersistAdapter);
      return reply.status(200).send(moduleData);
    } catch (error) {
      fastify.log.error('Error fetching target module:', error);
      return reply.internalServerError('Failed to fetch target module', { cause: error });
    }
  });
}

module.exports = fp(targetController);
