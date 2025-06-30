// eventDispatcherPlugin.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const EventEmitter = require('events'); // ADDITION: Using EventEmitter as a simple in-memory event bus

async function eventDispatcher(fastify, opts) {

  const eventBus = new EventEmitter();

  fastify.decorate('eventDispatcher', {

    publish: async (eventName, payload) => {
      fastify.log.info(`[EventDispatcher] Publishing event: ${eventName}`);
      try {
        const topicName = fastify.secrets.PUBSUB_MAIN_SUBSCRIPTION || 'main-sub'; 
        const topic = fastify.pubsubClient.topic(topicName);
        const event = { event: eventName, payload }; // Wrap eventName and payload
        const dataBuffer = Buffer.from(JSON.stringify(event));
        const messageId = await topic.publishMessage({ data: dataBuffer });
        fastify.log.info(`[EventDispatcher] Published Pub/Sub message ${messageId} for event: ${eventName}`);
      } catch (error) {
        fastify.log.error(`[EventDispatcher] Error publishing to Pub/Sub for event ${eventName}:`, error);
        // Optionally, re-throw or handle specific error scenarios
      }

      // ADDTION: Also emit to the in-memory event bus for immediate, local listeners
      eventBus.emit(eventName, payload);
    },

    subscribe: (eventName, listener) => {
      fastify.log.info(`[EventDispatcher] Subscribing to in-memory event: ${eventName}`);
      eventBus.on(eventName, listener);
    }
  });

  fastify.log.info('✅ Event Dispatcher decorated on Fastify instance');

  // ADDTION: Add a hook to process incoming Pub/Sub messages
  // This hook will be called once after all plugins are loaded.
  fastify.addHook('onReady', async () => {
    const subscriptionName = fastify.secrets.PUBSUB_SUBSCRIPTION_NAME || 'main-sub'; // Use env variable for subscription name
    const subscription = fastify.pubsubClient.subscription(subscriptionName);

    subscription.on('error', (error) => {
      fastify.log.error(`[EventDispatcher] Pub/Sub Stream Error (${subscriptionName}):`, error);
    });

    subscription.on('message', async (message) => {
      fastify.log.info(`[EventDispatcher] Received Pub/Sub message ${message.id} on subscription ${subscriptionName}`);
      try {
        const parsedData = JSON.parse(message.data.toString());
        const { event: eventName, payload } = parsedData;

        // Emit the event to the in-memory eventBus, which registered listeners will pick up
        if (eventName) {
          fastify.log.info(`[EventDispatcher] Dispatching received event '${eventName}' to local listeners.`);
          eventBus.emit(eventName, payload); // Use the in-memory event bus to dispatch
        } else {
          fastify.log.warn(`[EventDispatcher] Received Pub/Sub message ${message.id} with no 'event' field.`);
        }

        message.ack(); // Acknowledge the message upon successful processing
      } catch (error) {
        fastify.log.error(`[EventDispatcher] Error processing Pub/Sub message ${message.id}:`, error);
        message.nack(); // Nack the message to re-queue it for another attempt
      }
    });

    fastify.log.info(`[EventDispatcher] Listening for messages on Pub/Sub subscription: ${subscriptionName}...`);

    // Ensure the subscription is closed when the Fastify app closes
    fastify.addHook('onClose', async () => {
      fastify.log.info(`[EventDispatcher] Closing Pub/Sub subscription: ${subscriptionName}.`);
      await subscription.close();
    });
  });
}

module.exports = fp(eventDispatcher);