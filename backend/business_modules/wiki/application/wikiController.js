'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function wikiController(fastify, options) {

  // Fetch the whole wiki
  fastify.decorate('fetchWiki', async (userId, repoId) => {
    try {
      const wikiService = await fastify.diScope.resolve('wikiService');
      const wiki = await wikiService.fetchWiki(userId, repoId);
      return wiki;
    } catch (error) {
      fastify.log.error('Error fetching wiki:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch wiki', { cause: error });
    }
  });

  // Fetch a specific wiki page
  fastify.decorate('fetchPage', async (userId, pageId) => {
    try {
      const wikiService = await fastify.diScope.resolve('wikiService');
      const page = await wikiService.fetchPage(userId, pageId);
      return page;
    } catch (error) {
      fastify.log.error('Error fetching wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to fetch wiki page', { cause: error });
    }
  });

  // Create a new wiki page
  fastify.decorate('createPage', async (userId, title) => {
    try {
      const wikiService = await fastify.diScope.resolve('wikiService');
      const pageId = await wikiService.createPage(userId, title);
      return { message: 'Wiki page created successfully', pageId };
    } catch (error) {
      fastify.log.error('Error creating wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to create wiki page', { cause: error });
    }
  });

  // Update wiki page content
  fastify.decorate('updatePage', async (userId, pageId, newContent) => {
    try {
      const wikiService = await fastify.diScope.resolve('wikiService');
      await wikiService.updatePage(userId, pageId, newContent);
      return { message: 'Wiki page content updated successfully' };
    } catch (error) {
      fastify.log.error('Error updating wiki page content:', error);
      throw fastify.httpErrors.internalServerError('Failed to update wiki page content', { cause: error });
    }
  });

  // Analyze a wiki page
  fastify.decorate('analyzePage', async (userId, pageId) => {
    try {
      const wikiService = await fastify.diScope.resolve('wikiService');
      const analysisResult = await wikiService.analyzePage(userId, pageId);
      return analysisResult;
    } catch (error) {
      fastify.log.error('Error analyzing wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to analyze wiki page', { cause: error });
    }
  });

  // Delete a wiki page
  fastify.decorate('deletePage', async (userId, pageId) => {
    try {
      const wikiService = await fastify.diScope.resolve('wikiService');
      await wikiService.deletePage(userId, pageId);
      return { message: 'Wiki page deleted successfully' };
    } catch (error) {
      fastify.log.error('Error deleting wiki page:', error);
      throw fastify.httpErrors.internalServerError('Failed to delete wiki page', { cause: error });
    }
  });
}

module.exports = fp(wikiController);
