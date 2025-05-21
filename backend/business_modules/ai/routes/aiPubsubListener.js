// aiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'ai-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received AI message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());

          if (data.event === 'questionSent') {
            const { userId, conversationId, repoId, prompt } = data.payload;
            fastify.log.info(`Processing AI response for user: ${userId}, prompt: ${prompt}`);

            await fastify.respondToPrompt(userId, conversationId, repoId, prompt);

            fastify.log.info(`AI response handled by controller`);
          } else {
            fastify.log.warn(`Unknown event: ${data.event}`);
          }

          message.ack();
        } catch (error) {
          fastify.log.error('Error processing AI message:', error);
          message.nack();
        }
      }
    } catch (error) {
      fastify.log.error('Error pulling AI messages:', error);
    }
  }
  
  pullMessages();
  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling AI messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(aiPubsubListener);
