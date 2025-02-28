/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function wikiController(fastify, options) {
  let wikiService;

  try {
    wikiService = await fastify.diContainer.resolve('wikiService');
  } catch (error) {
    fastify.log.error('Error resolving wikiService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve wikiService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  // Fetch a specific wiki page
  fastify.decorate('fetchPage', async function (request, reply) {
    const { id: userId } = request.user;
    const { pageId } = request.params;
    try {
      const page = await wikiService.fetchPage(userId, pageId);
      return reply.status(200).send(page);
    } catch (error) {
      fastify.log.error('Error fetching wiki page:', error);
      return reply.internalServerError('Failed to fetch wiki page', { cause: error });
    }
  });
  
  // Create a new wiki page
  fastify.decorate('createPage', async function (request, reply) {
    const { id: userId } = request.user;
    const { title } = request.body;
    try {
      const pageId = await wikiService.createPage(userId, title);
      return reply.status(201).send({ message: 'Wiki page created successfully', pageId });
    } catch (error) {
      fastify.log.error('Error creating wiki page:', error);
      return reply.internalServerError('Failed to create wiki page', { cause: error });
    }
  });

  // Update wiki page content
  fastify.decorate('updatePage', async function (request, reply) {
    const { id: userId } = request.user;
    const { pageId } = request.params;
    const { newContent } = request.body;
    try {
      await wikiService.updatePage(userId, pageId, newContent);
      return reply.status(200).send({ message: 'Wiki page content updated successfully' });
    } catch (error) {
      fastify.log.error('Error updating wiki page content:', error);
      return reply.internalServerError('Failed to update wiki page content', { cause: error });
    }
  });

   // Analyze a wiki page
   fastify.decorate('analyzePage', async function (request, reply) {
    const { id: userId } = request.user;
    const { pageId } = request.params;
    try {
      const analysisResult = await wikiService.analyzePage(userId, pageId);
      return reply.status(200).send(analysisResult);
    } catch (error) {
      fastify.log.error('Error analyzing wiki page:', error);
      return reply.internalServerError('Failed to analyze wiki page', { cause: error });
    }
  });

    // Delete a wiki page
    fastify.decorate('deletePage', async function (request, reply) {
      const { id: userId } = request.user;
      const { pageId } = request.params;
      try {
        await wikiService.deletePage(userId, pageId);
        return reply.status(200).send({ message: 'Wiki page deleted successfully' });
      } catch (error) {
        fastify.log.error('Error deleting wiki page:', error);
        return reply.internalServerError('Failed to delete wiki page', { cause: error });
      }
    });
}

module.exports = fp(wikiController);
