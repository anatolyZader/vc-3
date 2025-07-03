// eventDispatcherPlugin.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const EventEmitter = require('events');

// Create a shared event bus for the simple function version
const sharedEventBus = new EventEmitter();

// SIMPLE FUNCTION VERSION (for DI usage)
async function simpleEventDispatcher(eventType, eventData) {
    console.log(`📡 EventDispatcher: Processing event '${eventType}'`, {
        eventType,
        eventData,
        timestamp: new Date().toISOString()
    });

    try {
        // Just emit the event to the shared event bus
        sharedEventBus.emit(eventType, eventData);
        console.log(`✅ Event '${eventType}' dispatched successfully`);
        
        if (eventType === 'questionAdded') {
            console.log('🤖 Received questionAdded - AI should process this');
            // This is where your AI listener should pick it up
        }
        
    } catch (error) {
        console.error(`❌ Error dispatching event '${eventType}':`, error);
        throw error;
    }
}

// ORIGINAL FASTIFY PLUGIN VERSION (unchanged)
async function eventDispatcher(fastify, opts) {
  const eventBus = new EventEmitter();

  fastify.decorate('eventDispatcher', {
    // For external events (Pub/Sub + in-memory)
    publish: async (eventName, payload) => {
      fastify.log.info(`[EventDispatcher] Publishing event: ${eventName}`);
      try {
        const topicName = fastify.secrets.PUBSUB_MAIN_SUBSCRIPTION || 'main-sub'; 
        const topic = fastify.pubsubClient.topic(topicName);
        const event = { event: eventName, payload };
        const dataBuffer = Buffer.from(JSON.stringify(event));
        const messageId = await topic.publishMessage({ data: dataBuffer });
        fastify.log.info(`[EventDispatcher] Published Pub/Sub message ${messageId} for event: ${eventName}`);
      } catch (error) {
        fastify.log.error(`[EventDispatcher] Error publishing to Pub/Sub for event ${eventName}:`, error);
      }

      // Also emit to the in-memory event bus for immediate, local listeners
      eventBus.emit(eventName, payload);
    },

    // For internal events (in-memory only) - ADD THIS METHOD
    emit: (eventName, payload) => {
      fastify.log.info(`[EventDispatcher] Emitting in-memory event: ${eventName}`);
      eventBus.emit(eventName, payload);
    },

    // For subscribing to events
    subscribe: (eventName, listener) => {
      fastify.log.info(`[EventDispatcher] Subscribing to in-memory event: ${eventName}`);
      eventBus.on(eventName, listener);
    }
  });

  fastify.log.info('✅ Event Dispatcher decorated on Fastify instance');

  // ...existing code... (the rest remains the same)
  fastify.addHook('onReady', async () => {
    const subscriptionName = fastify.secrets.PUBSUB_SUBSCRIPTION_NAME || 'main-sub';
    const subscription = fastify.pubsubClient.subscription(subscriptionName);

    subscription.on('error', (error) => {
      fastify.log.error(`[EventDispatcher] Pub/Sub Stream Error (${subscriptionName}):`, error);
    });

    subscription.on('message', async (message) => {
      fastify.log.info(`[EventDispatcher] Received Pub/Sub message ${message.id} on subscription ${subscriptionName}`);
      try {
        const parsedData = JSON.parse(message.data.toString());
        const { event: eventName, payload } = parsedData;

        if (eventName) {
          fastify.log.info(`[EventDispatcher] Dispatching received event '${eventName}' to local listeners.`);
          eventBus.emit(eventName, payload);
        } else {
          fastify.log.warn(`[EventDispatcher] Received Pub/Sub message ${message.id} with no 'event' field.`);
        }

        message.ack();
      } catch (error) {
        fastify.log.error(`[EventDispatcher] Error processing Pub/Sub message ${message.id}:`, error);
        message.nack();
      }
    });

    fastify.log.info(`[EventDispatcher] Listening for messages on Pub/Sub subscription: ${subscriptionName}...`);

    fastify.addHook('onClose', async () => {
      fastify.log.info(`[EventDispatcher] Closing Pub/Sub subscription: ${subscriptionName}.`);
      await subscription.close();
    });
  });
}

// Export both versions
module.exports = simpleEventDispatcher;  // The simple function for DI
module.exports.plugin = fp(eventDispatcher);  // The Fastify plugin
module.exports.eventBus = sharedEventBus;  // Access to the event bus