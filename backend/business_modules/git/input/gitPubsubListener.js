// gitPubsubListener.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function gitPubsubListener(fastify, options) {
  // Skip pub/sub setup during API spec generation
  if (process.env.BUILDING_API_SPEC === 'true') {
    fastify.log.info('📦 Skipping Git Pub/Sub listeners during API spec generation');
    return;
  }

  fastify.log.info('📦 Setting up Git Pub/Sub listeners...');
  
  const transport = fastify.transport;
  // Git Module uses its own subscription for internal events (fetchRepoRequest, persistRepoRequest)
  // AI Module subscribes to 'git-events' for repoPushed events
  const { getChannelName } = require('../../../messageChannels');
  const subscriptionName = getChannelName('git') + '-internal'; // 'git-events-internal'

  // Subscribe to messages using transport abstraction
  await transport.subscribe(subscriptionName, async (message) => {
    try {
      const { data } = message;
      
      fastify.log.info({ messageId: message.id, event: data.event }, 'Git module received message');

      if (data.event === 'fetchRepoRequest') {
        const { userId, repoId, correlationId } = data;
        fastify.log.info({ userId, repoId, correlationId }, 'Processing fetchRepo event');
        
        const parts = repoId.split('/');
        if (parts.length !== 2) {
          fastify.log.error({ repoId }, 'Invalid repoId format. Expected format: owner/repo');
          await message.ack(); // Ack malformed messages
          return;
        }
        const [owner, repo] = parts;

        if (typeof fastify.fetchRepo === 'function') {
          // Create a DI scope for this Pub/Sub request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for fetchRepo with DI scope
          const mockRequest = {
            params: { owner, repo },
            user: { id: userId },
            headers: { 'x-correlation-id': correlationId },
            diScope: diScope
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const repository = await fastify.fetchRepo(mockRequest, mockReply);
          
          fastify.log.info({ repoId }, 'Repository fetched via PubSub');
          await message.ack();
        } else {
          fastify.log.error('fastify.fetchRepo is not defined');
          await message.nack();
          return;
        }

      } else if (data.event === 'fetchDocsRequest') {
        const { userId, repoId, correlationId } = data;
        fastify.log.info({ userId, repoId, correlationId }, 'Processing fetchDocs event');

        if (typeof fastify.fetchDocs === 'function') {
          // Create a DI scope for this Pub/Sub request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for fetchDocs with DI scope
          const mockRequest = {
            params: { repoId },
            user: { id: userId },
            headers: { 'x-correlation-id': correlationId },
            diScope: diScope
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const docs = await fastify.fetchDocs(mockRequest, mockReply);
          
          fastify.log.info({ repoId }, 'Docs fetched via PubSub');
          await message.ack();
        } else {
          fastify.log.error('fastify.fetchDocs is not defined');
          await message.nack();
          return;
        }

      } else if (data.event === 'persistRepoRequest') {
        const { userId, repoId, correlationId, branch = 'main', forceUpdate = false, includeHistory = true } = data;
        fastify.log.info({ userId, repoId, branch, correlationId }, 'Processing persistRepo event');
        
        const parts = repoId.split('/');
        if (parts.length !== 2) {
          fastify.log.error({ repoId }, 'Invalid repoId format. Expected format: owner/repo');
          await message.ack(); // Ack malformed messages
          return;
        }
        const [owner, repo] = parts;

        if (typeof fastify.persistRepo === 'function') {
          // Create a DI scope for this Pub/Sub request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for persistRepo with DI scope
          const mockRequest = {
            params: { owner, repo },
            body: { branch, forceUpdate, includeHistory },
            user: { id: userId },
            headers: { 'x-correlation-id': correlationId },
            diScope: diScope
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.persistRepo(mockRequest, mockReply);
          
          fastify.log.info({ repoId }, 'Repository persisted via PubSub');
          await message.ack();
        } else {
          fastify.log.error('fastify.persistRepo is not defined');
          await message.nack();
          return;
        }

      } else {
        fastify.log.warn({ event: data.event }, 'Unknown event type');
        await message.ack(); // Ack unknown events
      }

      await message.ack();
    } catch (error) {
      fastify.log.error({ error, messageId: message.id }, 'Error processing message');
      await message.nack();
    }
  });

  fastify.log.info(`✅ Git module subscribed to: ${subscriptionName}`);
}

module.exports = fp(gitPubsubListener, {
  name: 'gitPubsubListener',
  dependencies: process.env.BUILDING_API_SPEC === 'true' ? [] : ['transportPlugin']
});