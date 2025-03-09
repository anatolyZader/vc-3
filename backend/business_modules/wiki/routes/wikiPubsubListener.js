// wikiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function wikiPubsubListener(fastify, options) {
  const subscriptionName = 'wiki-sub';
  const timeout = 60; // seconds

  const subscription = pubSubClient.subscription(subscriptionName);
  const messageHandler = async (message) => {
    fastify.log.info(`Received wiki message ${message.id}`);
    try {
      const data = JSON.parse(message.data.toString());
      const action = data.action;
      let result;

      switch (action) {
        case 'fetchWiki': {
          const { userId, repoId } = data.payload;
          fastify.log.info(`Processing fetchWiki for user: ${userId}, repo: ${repoId}`);
          result = await fastify.fetchWiki(userId, repoId);
          break;
        }
        case 'fetchPage': {
          const { userId, pageId } = data.payload;
          fastify.log.info(`Processing fetchPage for user: ${userId}, page: ${pageId}`);
          result = await fastify.fetchPage(userId, pageId);
          break;
        }
        case 'createPage': {
          const { userId, title } = data.payload;
          fastify.log.info(`Processing createPage for user: ${userId}, title: ${title}`);
          result = await fastify.createPage(userId, title);
          break;
        }
        case 'updatePage': {
          const { userId, pageId, newContent } = data.payload;
          fastify.log.info(`Processing updatePage for user: ${userId}, page: ${pageId}`);
          result = await fastify.updatePage(userId, pageId, newContent);
          break;
        }
        case 'analyzePage': {
          const { userId, pageId } = data.payload;
          fastify.log.info(`Processing analyzePage for user: ${userId}, page: ${pageId}`);
          result = await fastify.analyzePage(userId, pageId);
          break;
        }
        case 'deletePage': {
          const { userId, pageId } = data.payload;
          fastify.log.info(`Processing deletePage for user: ${userId}, page: ${pageId}`);
          result = await fastify.deletePage(userId, pageId);
          break;
        }
        default:
          fastify.log.warn(`Unknown wiki action: ${action}`);
      }

      if (result) {
        fastify.log.info(`Result: ${JSON.stringify(result)}`);
      }
      message.ack();
    } catch (error) {
      fastify.log.error('Error processing wiki message:', error);
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  fastify.log.info(`Listening for wiki messages on subscription: ${subscriptionName}...`);

  if (timeout) {
    setTimeout(() => {
      subscription.removeListener('message', messageHandler);
      fastify.log.info('Stopped listening for wiki messages.');
    }, timeout * 1000);
  }
}

module.exports = fp(wikiPubsubListener, { name: 'wiki-pubsub-listener' });
