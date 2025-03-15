// gitPubsubListener.js
/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function gitPubsubListener(fastify, options) {
  const subscriptionName = 'git-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received git message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());

          if (data.action === 'fetchRepo') {
            const { userId, repoId, correlationId } = data.payload;
            fastify.log.info(`Processing fetchRepo for user: ${userId}, repo: ${repoId}`);

            const repository = await fastify.fetchRepo(userId, repoId);
            fastify.log.info(`Repository fetched: ${JSON.stringify(repository)}`);

            const pubsubAdapter = fastify.diContainer.resolve('gitPubsubAdapter');
            await pubsubAdapter.publishRepoFetchedEvent(repository, correlationId);
          } else if (data.action === 'fetchWiki') {
            const { userId, repoId, correlationId } = data.payload;
            fastify.log.info(`Processing fetchWiki for user: ${userId}, repo: ${repoId}`);

            const wiki = await fastify.fetchWiki(userId, repoId);
            fastify.log.info(`Wiki fetched: ${JSON.stringify(wiki)}`);

            const pubsubAdapter = fastify.diContainer.resolve('gitPubsubAdapter');
            await pubsubAdapter.publishWikiFetchedEvent(wiki, correlationId);
          } else {
            fastify.log.warn(`Unknown action: ${data.action}`);
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

module.exports = fp(gitPubsubListener, { name: 'git-pubsub-listener' });
