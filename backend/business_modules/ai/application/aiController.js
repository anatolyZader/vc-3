// aiController.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiController(fastify, options) {


    fastify.decorate('respondToPrompt', async (request, reply) => {
      try {
        const { conversationId, prompt } = request.body;
        const userId = request.user.id;
        
        fastify.log.info(`🤖 AI Controller: Processing prompt for user ${userId}, conversation ${conversationId}`);
           // Check if diScope is available
      if (!request.diScope) {
        fastify.log.error('❌ AI Controller: diScope is missing in request');
        // Fallback: create scope manually
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ AI Controller: Created diScope manually as fallback');
      }
        
        const aiService = await request.diScope.resolve('aiService');
        if (!aiService) {
          fastify.log.error('❌ AI Controller: Failed to resolve aiService from diScope');
          throw new Error('aiService could not be resolved');
        }
        
        // Check and set userId on adapter if needed
        if (aiService.aiAdapter && typeof aiService.aiAdapter.setUserId === 'function') {
          aiService.aiAdapter.setUserId(userId);
          fastify.log.debug(`🔧 AI Controller: userId set on adapter: ${userId}`);
        }
        
        const TIMEOUT_MS = 90000; // Increased from 60s to 90s
        fastify.log.debug(`🔧 AI Controller: Timeout set to ${TIMEOUT_MS}ms`);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request processing timeout')), TIMEOUT_MS);
        });

        const responsePromise = aiService.respondToPrompt(userId, conversationId, prompt);
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        return { 
          response,
          status: 'success',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        fastify.log.error(`❌ AI Controller error:`, error);
        if (error.stack) {
          fastify.log.error(`❌ AI Controller error stack: ${error.stack}`);
        }
        throw fastify.httpErrors.internalServerError('Failed to process AI request', { cause: error });
      }
    });

    fastify.decorate('processPushedRepo', async (request, reply) => {
    try {
      const { repoId, repoData} = request.body;
      const userId = request.user.id; 
      fastify.log.info(`Processing pushed repository for user: ${userId}, repository: ${repoId}`);
      
      // Ensure diScope is available
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ Created diScope manually as fallback');
      }
      
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

  fastify.decorate('manualProcessRepoDirect', async (request, reply) => {
    try {
      const { repoId, githubOwner, repoName, branch = 'main', repoUrl } = request.body;
      const userId = request.user.id;
      
      fastify.log.info(`Manual direct repo processing requested for user: ${userId}, repository: ${repoId}`);
      
      // Construct repoData from the provided parameters
      const constructedRepoData = {
        githubOwner: githubOwner || repoId.split('/')[0],
        repoName: repoName || repoId.split('/')[1],
        repoUrl: repoUrl || `https://github.com/${repoId}`,
        branch: branch,
        description: `Manual processing of ${repoId}`,
        timestamp: new Date().toISOString()
      };
      
      // Validate constructed data
      if (!constructedRepoData.githubOwner || !constructedRepoData.repoName) {
        throw new Error('Invalid repoId format or missing githubOwner/repoName. Expected format: "owner/repo-name"');
      }
      
      fastify.log.info(`Constructed repo data:`, constructedRepoData);
      
      // Ensure diScope is available
      if (!request.diScope) {
        request.diScope = fastify.diContainer.createScope();
        fastify.log.info('✅ Created diScope manually as fallback');
      }
      
      const aiService = await request.diScope.resolve('aiService');
      if (!aiService) {
        throw new Error('AI service not found in DI container');
      }
      
      // Process the repository directly using AI service
      const response = await aiService.processPushedRepo(userId, repoId, constructedRepoData);
      
      fastify.log.info(`Manual direct repo processing completed: ${repoId}`);
      
      return {
        success: true,
        message: 'Repository processed successfully via direct method',
        repoId,
        repoData: constructedRepoData,
        data: response
      };
    } catch (error) {
      fastify.log.error('Error in manual direct repo processing:', error);
      throw fastify.httpErrors.internalServerError('Failed to process repository manually', { cause: error });
    }
  });

}

module.exports = fp(aiController);