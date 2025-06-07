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
          const { userId, repoId, correlationId } = data.payload;

          const eventHandlers = {
            fetchHttpApi: async () => {
              fastify.log.info(`Processing fetchHttpApiSpec for user: ${userId}, repo: ${repoId}`);
              const httpApi = await fastify.fetchHttpApi(userId, repoId); // ✅ Fixed: use repoId
              fastify.log.info(`http api fetched: ${JSON.stringify(httpApi)}`); // ✅ Fixed: use httpApi
              await fastify.diScope.resolve('apiPubsubAdapter').publishHttpApiFetchedEvent(httpApi, correlationId); // ✅ Fixed: pass correlationId
            },
          };

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

  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling api messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(apiPubsubListener);