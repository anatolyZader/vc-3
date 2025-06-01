// apiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function apiPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'api-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received api message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());
          const { userId, pageId, title, newContent, correlationId } = data.payload;

          // Define a mapping of event names to their corresponding handler functions
          const eventHandlers = {
            fetchHttpApi: async () => {
              fastify.log.info(`Processing fetchHttpApiSpec for user: ${userId}, page: ${pageId}`);
              const httpApi = await fastify.fetchHttpApi(userId, pageId);
              fastify.log.info(`Wiki Page fetched: ${JSON.stringify(wikiPage)}`);
              await fastify.diContainer.resolve('apiPubsubAdapter').publishHttpApiFetchedEvent(httpApi, correlationId);
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
          fastify.log.error('Error processing api message:', error);
          message.nack();
        }
      }
    } catch (error) {
      fastify.log.error('Error pulling api messages:', error);
    }
  }

  // Pull messages every 5 seconds
  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling api messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(apiPubsubListener);
