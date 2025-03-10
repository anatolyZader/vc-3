/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function chatPubsubListener(fastify, options) {
  const subscriptionName = 'chat-sub';
  const timeout = 60; // seconds

  const subscription = pubSubClient.subscription(subscriptionName);
  const messageHandler = async (message) => {
    fastify.log.info(`Received message ${message.id}`);
    try {
      const data = JSON.parse(message.data.toString());
      
      if (data.action === 'startConversation') {
        const { userId } = data.payload;
        const conversationId = await fastify.startConversation(userId);
        fastify.log.info(`Started conversation: ${conversationId}`);
      } else if (data.action === 'fetchConversation') {
        const { userId, conversationId } = data.payload;
        const conversation = await fastify.fetchConversation(userId, conversationId);
        fastify.log.info(`Fetched conversation: ${JSON.stringify(conversation)}`);
      } else if (data.action === 'addQuestion') {
        const { userId, conversationId, prompt } = data.payload;
        const questionId = await fastify.addQuestion(userId, conversationId, prompt);
        fastify.log.info(`Added question: ${questionId}`);
      } else if (data.action === 'addAnswer') {
        const { userId, conversationId, aiResponse } = data.payload;
        const answerId = await fastify.addAnswer(userId, conversationId, aiResponse);
        fastify.log.info(`Added answer: ${answerId}`);
      } else {
        fastify.log.warn(`Unknown action: ${data.action}`);
      }
      
      message.ack();
    } catch (error) {
      fastify.log.error('Error processing message:', error);
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  fastify.log.info(`Listening for chat messages on subscription: ${subscriptionName}...`);

  // Optional: Stop listening after the specified timeout.
  if (timeout) {
    setTimeout(() => {
      subscription.removeListener('message', messageHandler);
      fastify.log.info('Stopped listening for messages.');
    }, timeout * 1000);
  }
}

module.exports = fp(chatPubsubListener, {
  name: 'chat-pubsub-listener'
});
