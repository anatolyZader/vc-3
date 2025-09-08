// docsController.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function docsController(fastify, options) {

  // Fetch the whole docs
  fastify.decorate('fetchDocs', async (request, reply) => {
    try {
      const { repoId } = request.params;
      const userId = request.user?.id || request.userId; 
      const docsService = await request.diScope.resolve('docsService');
      const docs = await docsService.fetchDocs(userId, repoId);
      return docs;
    } catch (error) {
      fastify.log.error('Error fetching docs:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch docs', { cause: error });
    }
  });

  // Fetch a specific docs page
  fastify.decorate('fetchPage', async (request, reply) => {
    try {
      const { repoId, pageId } = request.params;
      const userId = request.user?.id || request.userId;
      const docsService = await request.diScope.resolve('docsService');
      const page = await docsService.fetchPage(userId, repoId, pageId);
      return page;
    } catch (error) {
      fastify.log.error('Error fetching docs page:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch docs page', { cause: error });
    }
  });

  // Create a new docs page
  fastify.decorate('createPage', async (request, reply) => {
    try {
      const { repoId } = request.params;
      const { pageTitle } = request.body; 
      const userId = request.user?.id || request.userId;
      const docsService = await request.diScope.resolve('docsService');
      await docsService.createPage(userId, repoId, pageTitle);
      return { message: 'Docs page created successfully' };
    } catch (error) {
      fastify.log.error('Error creating docs page:', error);
      throw fastify.httpErrors.internalServerError('Failed to create docs page', { cause: error });
    }
  });

  // Update docs page content
  fastify.decorate('updatePage', async (request, reply) => {
    try {
      const { repoId, pageId } = request.params;
      const { newContent } = request.body;
      const userId = request.user?.id || request.userId;
      const docsService = await request.diScope.resolve('docsService');
      await docsService.updatePage(userId, repoId, pageId, newContent);
      return { message: 'Docs page content updated successfully' };
    } catch (error) {
      fastify.log.error('Error updating docs page content:', error);
      throw fastify.httpErrors.internalServerError('Failed to update docs page content', { cause: error });
    }
  });

  // Delete a docs page
  fastify.decorate('deletePage', async (request, reply) => {
    try {
      const { repoId, pageId } = request.params;
      const userId = request.user?.id || request.userId;
      const docsService = await request.diScope.resolve('docsService');
      await docsService.deletePage(userId, repoId, pageId);
      return { message: 'Docs page deleted successfully' };
    } catch (error) {
      fastify.log.error('Error deleting docs page:', error);
      throw fastify.httpErrors.internalServerError('Failed to delete docs page', { cause: error });
    }
  });

  // Update all docs files from source code
  fastify.decorate('updateDocsFiles', async (request, reply) => {
    try {
      fastify.log.info('[docsController] updateDocsFiles started.');
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send({ message: 'User not authenticated.' });
      }
      const docsService = request.diScope.resolve('docsService');
      fastify.log.info('[docsController] docsService resolved.');

      // Execute the service method, which runs a background task.
      // The service itself is synchronous and queues the job.
      // We wrap this in a try/catch to handle any immediate errors during queuing.
      try {
        docsService.updateDocsFiles.bind(docsService)(userId);
      } catch (e) {
        // Catch synchronous errors from the service layer during queuing
        fastify.log.error(`[docsController] Failed to queue docs update task: ${e.message}`);
        // Still return 202, as the user's request was accepted, even if the background job failed to start.
        // The specific error is logged for debugging.
      }

      return reply.code(202).send({ message: 'Docs file update process has been queued.' });
    } catch (error) {
      // This outer catch handles errors like DI resolution or auth issues.
      fastify.log.error('Error starting docs file update:', error);
      return reply.code(500).send({ message: 'Failed to start docs file update.' });
    }
  });
}

module.exports = fp(docsController);