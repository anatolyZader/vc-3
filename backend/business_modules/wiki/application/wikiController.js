// wikiController.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function wikiController(fastify, options) {

  // Fetch the whole wiki
  fastify.decorate('fetchWiki', async (request, reply) => {
    try {
      const { repoId } = request.params;
      const userId = request.user?.id || request.userId; 
      const wikiService = await request.diScope.resolve('wikiService');
      const wiki = await wikiService.fetchWiki(userId, repoId);
      return wiki;
    } catch (error) {
      fastify.log.error('Error fetching wiki:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch wiki', { cause: error });
    }
  });

  // Fetch a specific wiki page
  fastify.decorate('fetchPage', async (request, reply) => {
    try {
      const { repoId, pageId } = request.params;
      const userId = request.user?.id || request.userId;
      const wikiService = await request.diScope.resolve('wikiService');
      const page = await wikiService.fetchPage(userId, repoId, pageId);
      return page;
    } catch (error) {
      fastify.log.error('Error fetching wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch wiki page', { cause: error });
    }
  });

  // Create a new wiki page
  fastify.decorate('createPage', async (request, reply) => {
    try {
      const { repoId } = request.params;
      const { pageTitle } = request.body; 
      const userId = request.user?.id || request.userId;
      const wikiService = await request.diScope.resolve('wikiService');
      await wikiService.createPage(userId, repoId, pageTitle);
      return { message: 'Wiki page created successfully' };
    } catch (error) {
      fastify.log.error('Error creating wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to create wiki page', { cause: error });
    }
  });

  // Update wiki page content
  fastify.decorate('updatePage', async (request, reply) => {
    try {
      const { repoId, pageId } = request.params;
      const { newContent } = request.body;
      const userId = request.user?.id || request.userId;
      const wikiService = await request.diScope.resolve('wikiService');
      await wikiService.updatePage(userId, repoId, pageId, newContent);
      return { message: 'Wiki page content updated successfully' };
    } catch (error) {
      fastify.log.error('Error updating wiki page content:', error);
      throw fastify.httpErrors.internalServerError('Failed to update wiki page content', { cause: error });
    }
  });

  // Delete a wiki page
  fastify.decorate('deletePage', async (request, reply) => {
    try {
      const { repoId, pageId } = request.params;
      const userId = request.user?.id || request.userId;
      const wikiService = await request.diScope.resolve('wikiService');
      await wikiService.deletePage(userId, repoId, pageId);
      return { message: 'Wiki page deleted successfully' };
    } catch (error) {
      fastify.log.error('Error deleting wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to delete wiki page', { cause: error });
    }
  });

  // Update all wiki files from source code
  fastify.decorate('updateWikiFiles', async (request, reply) => {
    try {
      fastify.log.info('[wikiController] updateWikiFiles started.');
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'User not authenticated.' });
      }
      const wikiService = request.diScope.resolve('wikiService');
      fastify.log.info('[wikiController] wikiService resolved.');

      // Execute the service method, which runs a background task.
      // The service itself is synchronous and queues the job.
      // We wrap this in a try/catch to handle any immediate errors during queuing.
      try {
        wikiService.updateWikiFiles.bind(wikiService)(userId);
      } catch (e) {
        // Catch synchronous errors from the service layer during queuing
        fastify.log.error(`[wikiController] Failed to queue wiki update task: ${e.message}`);
        // Still return 202, as the user's request was accepted, even if the background job failed to start.
        // The specific error is logged for debugging.
      }

      return reply.code(202).send({ message: 'Wiki file update process has been queued.' });
    } catch (error) {
      // This outer catch handles errors like DI resolution or auth issues.
      fastify.log.error('Error starting wiki file update:', error);
      return reply.code(500).send({ message: 'Failed to start wiki file update.' });
    }
  });
}

module.exports = fp(wikiController);