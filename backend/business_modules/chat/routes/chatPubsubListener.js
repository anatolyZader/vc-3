// chatPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatPubsubListener(fastify, options) {
  const subscriptionName = 'chat-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  // Define action handlers for different chat events.
  const actionHandlers = {
    startConversation: async ({ userId }) => {
      fastify.log.info(`Starting conversation for user: ${userId}`);
      // Ensure fastify.startConversation is available, e.g., via a service injected into fastify
      if (typeof fastify.startConversation === 'function') {
        return await fastify.startConversation(userId);
      } else {
        throw new Error('fastify.startConversation is not defined.');
      }
    },
    fetchConversation: async ({ userId, conversationId }) => {
      fastify.log.info(`Workspaceing conversation for user: ${userId}, conversation: ${conversationId}`);
      // Ensure fastify.fetchConversation is available
      if (typeof fastify.fetchConversation === 'function') {
        return await fastify.fetchConversation(userId, conversationId);
      } else {
        throw new Error('fastify.fetchConversation is not defined.');
      }
    },
    addQuestion: async ({ userId, conversationId, prompt }) => {
      fastify.log.info(`Adding question for user: ${userId}, conversation: ${conversationId}`);
      // Ensure fastify.addQuestion is available
      if (typeof fastify.addQuestion === 'function') {
        return await fastify.addQuestion(userId, conversationId, prompt);
      } else {
        throw new Error('fastify.addQuestion is not defined.');
      }
    },
    addAnswer: async ({ userId, conversationId, aiResponse }) => {
      fastify.log.info(`Adding answer for user: ${userId}, conversation: ${conversationId}`);
      // Ensure fastify.addAnswer is available
      if (typeof fastify.addAnswer === 'function') {
        return await fastify.addAnswer(userId, conversationId, aiResponse);
      } else {
        throw new Error('fastify.addAnswer is not defined.');
      }
    },
    // Add other action handlers if needed, e.g., for renameConversation, deleteConversation
    // You'd typically want to handle all events that the chat module might publish.
  };

  // ---

  // Set up error handling for the Pub/Sub subscription stream.
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
    // Consider adding retry logic or alert mechanisms for persistent errors.
  });

  // ---

  // Set up the message handler for incoming Pub/Sub messages.
  subscription.on('message', async (message) => {
    fastify.log.info(`Received chat message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());
      const { action, payload } = data;

      if (actionHandlers[action]) {
        await actionHandlers[action](payload); // Execute the corresponding handler
        fastify.log.info(`Chat action '${action}' processed for message ${message.id}.`);
      } else {
        fastify.log.warn(`Unknown chat action '${action}' for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing.
    } catch (error) {
      fastify.log.error(`Error processing chat message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt if processing failed.
    }
  });

  fastify.log.info(`Listening for chat messages on Pub/Sub subscription: ${subscriptionName}...`);

  // ---

  // Ensure the Pub/Sub subscription is gracefully closed when the Fastify application shuts down.
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(chatPubsubListener);