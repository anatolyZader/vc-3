/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function wikiController(fastify, options) {
  let projectWikiService;

  try {
    projectWikiService = await fastify.diContainer.resolve('projectWikiService');
  } catch (error) {
    fastify.log.error('Error resolving projectWikiService:', error);
    throw fastify.httpErrors.internalServerError(
      'Failed to resolve projectWikiService. Ensure it is registered in the DI container.',
      { cause: error }
    );
  }

  // Create a new wiki page
  fastify.decorate('createPage', async function (request, reply) {
    const { userId, title, content } = request.body;
    try {
      const pageId = await projectWikiService.createPage(userId, title, content);
      return reply.status(201).send({ message: 'Wiki page created successfully', pageId });
    } catch (error) {
      fastify.log.error('Error creating wiki page:', error);
      return reply.internalServerError('Failed to create wiki page', { cause: error });
    }
  });

  // Fetch list of wiki pages
  fastify.decorate('fetchPagesList', async function (request, reply) {
    const { userId } = request.query;
    try {
      const pages = await projectWikiService.fetchPagesList(userId);
      return reply.status(200).send(pages);
    } catch (error) {
      fastify.log.error('Error fetching wiki pages list:', error);
      return reply.internalServerError('Failed to fetch wiki pages list', { cause: error });
    }
  });

  // Fetch a specific wiki page
  fastify.decorate('fetchPage', async function (request, reply) {
    const { userId } = request.query;
    const { pageId } = request.params;
    try {
      const page = await projectWikiService.fetchPage(userId, pageId);
      return reply.status(200).send(page);
    } catch (error) {
      fastify.log.error('Error fetching wiki page:', error);
      return reply.internalServerError('Failed to fetch wiki page', { cause: error });
    }
  });

  // Rename a wiki page
  fastify.decorate('renamePage', async function (request, reply) {
    const { pageId } = request.params;
    const { userId, newTitle } = request.body;
    try {
      await projectWikiService.renamePage(userId, pageId, newTitle);
      return reply.status(200).send({ message: 'Wiki page renamed successfully' });
    } catch (error) {
      fastify.log.error('Error renaming wiki page:', error);
      return reply.internalServerError('Failed to rename wiki page', { cause: error });
    }
  });

  // Delete a wiki page
  fastify.decorate('deletePage', async function (request, reply) {
    const { pageId } = request.params;
    const { userId } = request.body;
    try {
      await projectWikiService.deletePage(userId, pageId);
      return reply.status(200).send({ message: 'Wiki page deleted successfully' });
    } catch (error) {
      fastify.log.error('Error deleting wiki page:', error);
      return reply.internalServerError('Failed to delete wiki page', { cause: error });
    }
  });

  // Update wiki page content
  fastify.decorate('updatePageContent', async function (request, reply) {
    const { pageId } = request.params;
    const { userId, newContent } = request.body;
    try {
      await projectWikiService.updatePageContent(userId, pageId, newContent);
      return reply.status(200).send({ message: 'Wiki page content updated successfully' });
    } catch (error) {
      fastify.log.error('Error updating wiki page content:', error);
      return reply.internalServerError('Failed to update wiki page content', { cause: error });
    }
  });
}

module.exports = fp(wikiController);
