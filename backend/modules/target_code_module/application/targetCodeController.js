'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function targetCodeController(fastify, options) {
  let targetCodeService, targetCodePersistAdapter;

  try {
    targetCodeService = await fastify.diContainer.resolve('targetCodeService');
  } catch (error) {
    fastify.log.error('Error resolving targetCodeService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve targetCodeService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  try {
    targetCodePersistAdapter = await fastify.diContainer.resolve('targetCodePersistAdapter');
  } catch (error) {
    fastify.log.error('Error resolving targetCodePersistAdapter:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve targetCodePersistAdapter.',
      { cause: error }
    );
  }

  fastify.decorate('fetchTargetCode', async function (request, reply) {
    const { moduleId } = request.params;
    try {
      const moduleData = await targetCodeService.fetchTargetCode(moduleId, targetCodePersistAdapter);
      return reply.status(200).send(moduleData);
    } catch (error) {
      fastify.log.error('Error fetching target module:', error);
      return reply.internalServerError('Failed to fetch target module', { cause: error });
    }
  });
}

module.exports = fp(targetCodeController);
