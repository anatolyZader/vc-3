// aiController.js
/* eslint-disable no-unused-vars */

'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {

  fastify.decorate('respondToPrompt', async (userId, conversationId, repoId, prompt) => {
    try {
      const aiService = await fastify.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      const response = await aiService.respondToPrompt(userId, conversationId,repoId, prompt);
      return response;
    } catch (error) {
      fastify.log.error('Error responding to prompt:', error);
      throw fastify.httpErrors.internalServerError('Failed to respond to prompt', { cause: error });
    }
  });
}

module.exports = fp(aiController);
