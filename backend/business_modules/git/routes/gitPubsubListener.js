// gitPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function gitPubsubListener(fastify, options) {
  const subscriptionName = 'git-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received git message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());
          const { userId, pageId, title, newContent, correlationId } = data.payload;

          // Define a mapping of event names to their corresponding handler functions
          const eventHandlers = {
            fetchWikiPage: async () => {
              fastify.log.info(`Processing fetchWikiPage for user: ${userId}, page: ${pageId}`);
              const wikiPage = await fastify.fetchWikiPage(userId, pageId);
              fastify.log.info(`Wiki Page fetched: ${JSON.stringify(wikiPage)}`);
              await fastify.diContainer.resolve('gitPubsubAdapter').publishWikiPageFetchedEvent(wikiPage, correlationId);
            },
            createWikiPage: async () => {
              fastify.log.info(`Processing createWikiPage for user: ${userId}, title: ${title}`);
              await fastify.createWikiPage(userId, title);
              fastify.log.info(`Wiki Page created successfully`);
            },
            updateWikiPage: async () => {
              fastify.log.info(`Processing updateWikiPage for user: ${userId}, page: ${pageId}`);
              await fastify.updateWikiPage(userId, pageId, newContent);
              fastify.log.info(`Wiki Page updated successfully`);
            },
            deleteWikiPage: async () => {
              fastify.log.info(`Processing deleteWikiPage for user: ${userId}, page: ${pageId}`);
              await fastify.deleteWikiPage(userId, pageId);
              fastify.log.info(`Wiki Page deleted successfully`);
            },
          };

          // Check if the event exists in our handler map
          if (eventHandlers[data.event]) {
            await eventHandlers[data.event]();
          } else {
            fastify.log.warn(`Unknown event: ${data.event}`);
          }

          message.ack();
        } catch (error) {
          fastify.log.error('Error processing git message:', error);
          message.nack();
        }
      }
    } catch (error) {
      fastify.log.error('Error pulling git messages:', error);
    }
  }

  // Pull messages every 5 seconds
  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling Git messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(gitPubsubListener, { name: 'git-pubsub-listener' });
