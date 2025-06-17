// aiController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {

  // HTTP route handler - extract params from request
  fastify.decorate('respondToPrompt', async (request, reply) => {
    try {
      const { conversationId, repoId, prompt } = request.body;
      const userId = request.user.id; // Assuming user is set by verifyToken middleware
      
      fastify.log.info(`Processing AI request for user: ${userId}, conversation: ${conversationId}, repo: ${repoId}`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      const response = await aiService.respondToPrompt(userId, conversationId, repoId, prompt);
      
      fastify.log.info(`AI response generated for conversation: ${conversationId}`);
      return response;
    } catch (error) {
      fastify.log.error('Error responding to prompt:', error);
      throw fastify.httpErrors.internalServerError('Failed to respond to prompt', { cause: error });
    }
  });
}

module.exports = fp(aiController);