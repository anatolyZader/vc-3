// aiController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {


  fastify.decorate('respondToPrompt', async (request, reply) => {
    try {
      const { conversationId, prompt } = request.body;
      const userId = request.user.id; // Get userId from authenticated user
      
      fastify.log.info(`🤖 AI Controller: Processing prompt for user ${userId}, conversation ${conversationId}`);
      
      const aiService = await request.diScope.resolve('aiService');
      const response = await aiService.respondToPrompt(userId, conversationId, prompt);
      
      return { 
        response,
        status: 'success',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`❌ AI Controller error:`, error);
      throw fastify.httpErrors.internalServerError('Failed to process AI request', { cause: error });
    }
  });

    fastify.decorate('processPushedRepo', async (request, reply) => {
    try {
      const { repoId, repoData} = request.body;
      const userId = request.user.id; 
      fastify.log.info(`Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      const response = await aiService.processPushedRepo(userId, repoId, repoData);
      
      fastify.log.info(`pushed repo processed: ${repoId}`);
      return response;
    } catch (error) {
      fastify.log.error('Error processing pushed repo:', error);
      throw fastify.httpErrors.internalServerError('Failed to process pushed repo:', { cause: error });
    }
  });
}

module.exports = fp(aiController);