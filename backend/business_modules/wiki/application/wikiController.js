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
}

module.exports = fp(wikiController);