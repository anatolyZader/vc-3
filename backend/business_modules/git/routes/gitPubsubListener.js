// gitPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function gitPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
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
            fetchRepo: async () => {
              fastify.log.info(`Processing fetchRepo for user: ${userId}`);
              const repository = await fastify.fetchRepo(userId, data.payload.repoId);
              fastify.log.info(`Repository fetched: ${JSON.stringify(repository)}`);
              await fastify.diContainer.resolve('gitPubsubAdapter').publishRepoFetchedEvent(repository, correlationId);
            },  
            fetchWikiPage: async () => {
              fastify.log.info(`Processing fetchWikiPage for user: ${userId}, page: ${pageId}`);
              const wikiPage = await fastify.fetchWiki(userId, pageId);
              fastify.log.info(`Wiki Page fetched: ${JSON.stringify(wikiPage)}`);
              await fastify.diContainer.resolve('gitPubsubAdapter').publishWikiPageFetchedEvent(wikiPage, correlationId);
            }
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

module.exports = fp(gitPubsubListener);
