// aiAssistController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiAssistController(fastify, options) {
  let aiAssistService;

  try {
    aiAssistService = await fastify.diContainer.resolve('aiAssistService');
  } catch (error) {
    fastify.log.error('Error resolving aiAssistService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve aiAssistService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  fastify.decorate('startConversation', async (request, reply) => {
    const { userId } = request.body;
    try {
      const conversationId = await aiAssistService.startConversation(userId);
      return reply.status(201).send({ message: 'AI conversation started', conversationId });
    } catch (error) {
      fastify.log.error('Error starting AI conversation:', error);
      return reply.internalServerError('Failed to start AI conversation', { cause: error });
    }
  });

  fastify.decorate('respondToPrompt', async (request, reply) => {
    const { userId, prompt } = request.body;
    try {
      const response = await aiAssistService.respondToPrompt(userId, prompt);
      return reply.status(200).send({ response });
    } catch (error) {
      fastify.log.error('Error responding to prompt:', error);
      return reply.internalServerError('Failed to respond to prompt', { cause: error });
    }
  });
}

module.exports = fp(aiAssistController);
