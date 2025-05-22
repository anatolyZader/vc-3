// wikiPubsubListener.js
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
      if (typeof fastify.fetchWiki === 'function') {
        return await fastify.fetchWiki(userId, repoId);
      } else {
        throw new Error('fastify.fetchWiki is not defined.');
      }
    },
    fetchPage: async (payload) => {
      const { userId, pageId } = payload;
      fastify.log.info(`Processing fetchPage for user: ${userId}, page: ${pageId}`);
      if (typeof fastify.fetchPage === 'function') {
        return await fastify.fetchPage(userId, pageId);
      } else {
        throw new Error('fastify.fetchPage is not defined.');
      }
    },
    createPage: async (payload) => {
      const { userId, title } = payload;
      fastify.log.info(`Processing createPage for user: ${userId}, title: ${title}`);
      if (typeof fastify.createPage === 'function') {
        return await fastify.createPage(userId, title);
      } else {
        throw new Error('fastify.createPage is not defined.');
      }
    },
    updatePage: async (payload) => {
      const { userId, pageId, newContent } = payload;
      fastify.log.info(`Processing updatePage for user: ${userId}, page: ${pageId}`);
      if (typeof fastify.updatePage === 'function') {
        return await fastify.updatePage(userId, pageId, newContent);
      } else {
        throw new Error('fastify.updatePage is not defined.');
      }
    },
    analyzePage: async (payload) => {
      const { userId, pageId } = payload;
      fastify.log.info(`Processing analyzePage for user: ${userId}, page: ${pageId}`);
      if (typeof fastify.analyzePage === 'function') {
        return await fastify.analyzePage(userId, pageId);
      } else {
        throw new Error('fastify.analyzePage is not defined.');
      }
    },
    deletePage: async (payload) => {
      const { userId, pageId } = payload;
      fastify.log.info(`Processing deletePage for user: ${userId}, page: ${pageId}`);
      if (typeof fastify.deletePage === 'function') {
        return await fastify.deletePage(userId, pageId);
      } else {
        throw new Error('fastify.deletePage is not defined.');
      }
    },
  };

  // Set up error handling for the Pub/Sub subscription stream.
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
    // Consider adding retry logic or alert mechanisms for persistent errors.
  });

}

module.exports = fp(wikiPubsubListener);