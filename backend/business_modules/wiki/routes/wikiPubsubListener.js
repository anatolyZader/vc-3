/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');

async function wikiPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'wiki-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  const actionHandlers = {
    fetchWiki: async (payload) => {
      const { userId, repoId } = payload;
      fastify.log.info(`Processing fetchWiki for user: ${userId}, repo: ${repoId}`);
      const wikiService = await fastify.diScope.resolve('wikiService');
      return await wikiService.fetchWiki(userId, repoId);
    },
    fetchPage: async (payload) => {
      const { userId, repoId, pageId } = payload;
      fastify.log.info(`Processing fetchPage for user: ${userId}, page: ${pageId}`);
      const wikiService = await fastify.diScope.resolve('wikiService');
      return await wikiService.fetchPage(userId, repoId, pageId);
    },
    createPage: async (payload) => {
      const { userId, repoId, pageTitle } = payload;
      fastify.log.info(`Processing createPage for user: ${userId}, title: ${pageTitle}`);
      const wikiService = await fastify.diScope.resolve('wikiService');
      return await wikiService.createPage(userId, repoId, pageTitle);
    },
    updatePage: async (payload) => {
      const { userId, repoId, pageId, newContent } = payload;
      fastify.log.info(`Processing updatePage for user: ${userId}, page: ${pageId}`);
      const wikiService = await fastify.diScope.resolve('wikiService');
      return await wikiService.updatePage(userId, repoId, pageId, newContent);
    },
    deletePage: async (payload) => {
      const { userId, repoId, pageId } = payload;
      fastify.log.info(`Processing deletePage for user: ${userId}, page: ${pageId}`);
      const wikiService = await fastify.diScope.resolve('wikiService');
      return await wikiService.deletePage(userId, repoId, pageId);
    },
  };

  // Handle incoming messages
  subscription.on('message', async (message) => {
    try {
      const data = JSON.parse(message.data.toString());
      const { action, payload } = data;
      
      if (actionHandlers[action]) {
        const result = await actionHandlers[action](payload);
        fastify.log.info(`Successfully processed ${action}`, result);
      } else {
        fastify.log.warn(`Unknown action: ${action}`);
      }
      
      message.ack();
    } catch (error) {
      fastify.log.error('Error processing PubSub message:', error);
      message.nack();
    }
  });

  // Set up error handling for the Pub/Sub subscription stream.
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
  });
}

module.exports = fp(wikiPubsubListener);