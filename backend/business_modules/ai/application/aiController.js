// aiController.js
/* eslint-disable no-unused-vars */
// tttt
'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {

  let aiService;

  try {
    aiService = await fastify.diContainer.resolve('aiService');
  } catch (error) {
    fastify.log.error('Error resolving aiService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve aiService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  fastify.decorate('respondToPrompt', async (userId, conversationId, repoId, prompt) => {
    try {
      const response = await aiService.respondToPrompt(userId, conversationId,repoId, prompt);
      return response;
    } catch (error) {
      fastify.log.error('Error responding to prompt:', error);
      throw fastify.httpErrors.internalServerError('Failed to respond to prompt', { cause: error });
    }
  });
}

module.exports = fp(aiController);
