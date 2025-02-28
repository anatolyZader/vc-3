// aiController.js
/* eslint-disable no-unused-vars */
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

  fastify.decorate('respondToPrompt', async (request, reply) => {
    const { id: userId } = request.user;
    const { conversationId, prompt } = request.body;
    try {
      const response = await aiService.respondToPrompt(userId, conversationId, prompt);
      return reply.status(200).send({ response });
    } catch (error) {
      fastify.log.error('Error responding to prompt:', error);
      return reply.internalServerError('Failed to respond to prompt', { cause: error });
    }
  });
}

module.exports = fp(aiController);
