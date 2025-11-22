// docsPubsubListener.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function docsPubsubListener(fastify, options) {
  // Skip pub/sub setup during API spec generation
  if (process.env.BUILDING_API_SPEC === 'true') {
    fastify.log.info('📚 Skipping Docs Pub/Sub listeners during API spec generation');
    return;
  }

  fastify.log.info('📚 Setting up Docs Pub/Sub listeners...');
  
  const transport = fastify.transport;
  const { getChannelName } = require('../../../messageChannels');
  const subscriptionName = getChannelName('docs') + '-internal'; // 'docs-events-internal'

  // Subscribe to messages using transport abstraction
  await transport.subscribe(subscriptionName, async (message) => {
    try {
      const { data } = message;
      
      fastify.log.info({ messageId: message.id, event: data.event }, 'Docs module received message');

      if (data.event === 'fetchDocsRequest') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info({ userId, repoId, correlationId }, 'Processing fetchDocs event');

        if (typeof fastify.fetchDocs === 'function') {
          // Create DI scope for this request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for fetchDocs
          const mockRequest = {
            params: { repoId },
            user: { id: userId },
            diScope: diScope
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const docs = await fastify.fetchDocs(mockRequest, mockReply);
          
          fastify.log.info({ repoId }, 'Docs fetched via PubSub');
          
          // Publish the result event
          const docsPubsubAdapter = await diScope.resolve('docsPubsubAdapter');
          await docsPubsubAdapter.publishfetchedDocsEvent(docs);
          
          fastify.log.info({ messageId: message.id }, 'Docs fetch result published');
          await message.ack();
        } else {
          fastify.log.error('fastify.fetchDocs is not defined');
          await message.nack();
          return;
        }

      } else if (data.event === 'fetchPage') {
        const { userId, repoId, pageId, correlationId } = data.payload;
        fastify.log.info({ userId, repoId, pageId, correlationId }, 'Processing fetchPage event');

        if (typeof fastify.fetchPage === 'function') {
          // Create DI scope for this request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for fetchPage
          const mockRequest = {
            params: { repoId, pageId },
            user: { id: userId },
            diScope: diScope
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const page = await fastify.fetchPage(mockRequest, mockReply);
          
          fastify.log.info({ repoId, pageId }, 'Docs page fetched via PubSub');
          
          // Publish the result event
          const docsPubsubAdapter = await diScope.resolve('docsPubsubAdapter');
          await docsPubsubAdapter.publishfetchedDocsEvent(page);
          
          fastify.log.info({ messageId: message.id }, 'Page fetch result published');
          await message.ack();
        } else {
          fastify.log.error('fastify.fetchPage is not defined');
          await message.nack();
          return;
        }

      } else if (data.event === 'createPage') {
        const { userId, repoId, pageTitle, correlationId } = data.payload;
        fastify.log.info({ userId, repoId, pageTitle, correlationId }, 'Processing createPage event');

        if (typeof fastify.createPage === 'function') {
          // Create DI scope for this request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for createPage
          const mockRequest = {
            params: { repoId },
            body: { pageTitle },
            user: { id: userId },
            diScope: diScope
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.createPage(mockRequest, mockReply);
          
          fastify.log.info({ repoId, pageTitle }, 'Page created via PubSub');
          
          // Publish the result event
          const docsPubsubAdapter = await diScope.resolve('docsPubsubAdapter');
          await docsPubsubAdapter.publishfetchedDocsEvent(result);
          
          fastify.log.info({ messageId: message.id }, 'Page create result published');
          await message.ack();
        } else {
          fastify.log.error('fastify.createPage is not defined');
          await message.nack();
          return;
        }

      } else {
        fastify.log.warn({ event: data.event }, 'Unknown event type');
        await message.ack(); // Ack unknown events
      }
    } catch (error) {
      fastify.log.error({ error, messageId: message.id }, 'Error processing message');
      await message.nack();
    }
  });

  fastify.log.info(`✅ Docs module subscribed to: ${subscriptionName}`);
}

module.exports = fp(docsPubsubListener, {
  name: 'docsPubsubListener',
  dependencies: process.env.BUILDING_API_SPEC === 'true' ? [] : ['transportPlugin']
});
