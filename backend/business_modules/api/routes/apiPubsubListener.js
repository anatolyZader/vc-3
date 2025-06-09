// apiPubsubListener.js
'use strict';

const fp = require('fastify-plugin');

async function apiPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'api-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received api message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'fetchHttpApi') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchHttpApi event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchHttpApi === 'function') {
          // Create mock request object for fetchHttpApi
          const mockRequest = {
            query: { repoId },
            user: { id: userId }
          };
          const mockReply = {
            badRequest: (message) => {
              throw new Error(`Bad Request: ${message}`);
            }
          };

          // Call the same HTTP handler with mock request
          const httpApi = await fastify.fetchHttpApi(mockRequest, mockReply);
          
          fastify.log.info(`HTTP API fetched via PubSub: ${JSON.stringify(httpApi)}`);
          
          // Publish the result event
          const apiPubsubAdapter = await fastify.diScope.resolve('apiPubsubAdapter');
          await apiPubsubAdapter.publishHttpApiFetchedEvent(httpApi, correlationId);
          
          fastify.log.info(`HTTP API fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchHttpApi is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing api message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });

  fastify.log.info(`Listening for API messages on Pub/Sub subscription: ${subscriptionName}...`);

  // Ensure the subscription is closed when the Fastify app closes
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(apiPubsubListener);