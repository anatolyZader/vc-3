// wikiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function wikiPubsubListener(fastify, options) {
  const subscriptionName = 'wiki-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  const actionHandlers = {
    fetchWiki: async ({ userId, repoId }) => {
      fastify.log.info(`Processing fetchWiki for user: ${userId}, repo: ${repoId}`);
      return await fastify.fetchWiki(userId, repoId);
    },
    fetchPage: async ({ userId, pageId }) => {
      fastify.log.info(`Processing fetchPage for user: ${userId}, page: ${pageId}`);
      return await fastify.fetchPage(userId, pageId);
    },
    createPage: async ({ userId, title }) => {
      fastify.log.info(`Processing createPage for user: ${userId}, title: ${title}`);
      return await fastify.createPage(userId, title);
    },
    updatePage: async ({ userId, pageId, newContent }) => {
      fastify.log.info(`Processing updatePage for user: ${userId}, page: ${pageId}`);
      return await fastify.updatePage(userId, pageId, newContent);
    },
    analyzePage: async ({ userId, pageId }) => {
      fastify.log.info(`Processing analyzePage for user: ${userId}, page: ${pageId}`);
      return await fastify.analyzePage(userId, pageId);
    },
    deletePage: async ({ userId, pageId }) => {
      fastify.log.info(`Processing deletePage for user: ${userId}, page: ${pageId}`);
      return await fastify.deletePage(userId, pageId);
    },
  };

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received wiki message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());
          const { action, payload } = data;

          if (actionHandlers[action]) {
            const result = await actionHandlers[action](payload);
            fastify.log.info(`Result: ${JSON.stringify(result)}`);
          } else {
            fastify.log.warn(`Unknown wiki action: ${action}`);
          }

          message.ack();
        } catch (error) {
          fastify.log.error('Error processing wiki message:', error);
          message.nack();
        }
      }
    } catch (error) {
      fastify.log.error('Error pulling wiki messages:', error);
    }
  }

  // Pull messages every 5 seconds
  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling Wiki messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(wikiPubsubListener, { name: 'wiki-pubsub-listener' });
