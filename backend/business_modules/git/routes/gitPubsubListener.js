// gitPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function gitPubsubListener(fastify, options) {
  const subscriptionName = 'git-sub';
  const timeout = 60; // seconds

  const subscription = pubSubClient.subscription(subscriptionName);
  const messageHandler = async (message) => {
    fastify.log.info(`Received git message ${message.id}`);
    try {
      const data = JSON.parse(message.data.toString());
      if (data.action === 'fetchRepo') {
        const { userId, repoId } = data.payload;
        fastify.log.info(`Processing fetchRepo for user: ${userId}, repo: ${repoId}`);
        const repository = await fastify.fetchRepo(userId, repoId);
        fastify.log.info(`Repository fetched: ${JSON.stringify(repository)}`);
      } else {
        fastify.log.warn(`Unknown action: ${data.action}`);
      }
      message.ack();
    } catch (error) {
      fastify.log.error('Error processing git message:', error);
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  fastify.log.info(`Listening for git messages on subscription: ${subscriptionName}...`);

  if (timeout) {
    setTimeout(() => {
      subscription.removeListener('message', messageHandler);
      fastify.log.info('Stopped listening for git messages.');
    }, timeout * 1000);
  }
}

module.exports = fp(gitPubsubListener, { name: 'git-pubsub-listener' });
