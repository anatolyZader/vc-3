'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiPubsubListener(fastify, opts) {
  fastify.log.info('🤖 Setting up AI listeners...');
  
  const { eventDispatcher } = fastify;
  
  if (!eventDispatcher) {
    throw new Error('[AI Module] eventDispatcher not available. Ensure eventDispatcher plugin is registered.');
  }

  // ────────────────────────────────────────────────────────────────
  // Internal Event Handlers (in-process only)
  // ────────────────────────────────────────────────────────────────

  /**
   * Handle repoPushed events
   * Triggered when Git module pushes repo data for AI processing
   */
  eventDispatcher.subscribe('repoPushed', async (data) => {
    try {
      fastify.log.info({ data }, '[AI] Received repoPushed event');
      
      if (!data) {
        throw new Error('Invalid event data: empty data');
      }
      
      const { userId, repoId, repoData } = data;
      
      // DEBUG: Log the structure in development only
      if (process.env.NODE_ENV === 'development') {
        const { createRepoDataSummary } = require('../infrastructure/ai/rag_pipelines/context/utils/safeLogger');
        fastify.log.info({ summary: createRepoDataSummary(repoData) }, '[AI] repoData summary');
      }
      
      if (!userId || !repoId) {
        throw new Error(`Missing required fields: userId=${userId}, repoId=${repoId}`);
      }
      
      fastify.log.info({ repoId, userId }, '[AI] Processing repository');
      
      // Create DI scope for the processing
      const diScope = fastify.diContainer.createScope();
      
      // Initialize text search service before processing
      try {
        const aiService = await diScope.resolve('aiService');
        const postgresAdapter = await diScope.resolve('aiPersistAdapter');
        
        if (aiService && postgresAdapter && aiService.aiAdapter) {
          if (!aiService.aiAdapter.textSearchService) {
            fastify.log.info('[AI] Initializing text search before repo processing...');
            await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
            fastify.log.info('[AI] Text search initialized successfully');
          }
        }
      } catch (initError) {
        fastify.log.error({ err: initError }, '[AI] Text search initialization failed, continuing anyway');
      }
      
      // Create mock request/reply for controller
      const mockRequest = {
        body: { repoId, repoData },
        user: { id: userId },
        diScope
      };
      
      const mockReply = {
        code: (code) => mockReply,
        send: (response) => response
      };

      // Call the controller
      if (typeof fastify.processPushedRepo === 'function') {
        const result = await fastify.processPushedRepo(mockRequest, mockReply);
      
        if (result && result.success) {
          fastify.log.info(
            { repoId, chunksStored: result.chunksStored || 0 },
            '[AI] Repository processed successfully'
          );
          
          // Emit repoProcessed event (internal only for now)
          eventDispatcher.emitInternal('repoProcessed', {
            userId,
            repoId,
            result,
            timestamp: new Date().toISOString()
          });
        } else {
          fastify.log.warn({ repoId }, '[AI] Failed to process repository');
        }
      }
    } catch (error) {
      fastify.log.error({ err: error }, '[AI] Error processing repoPushed event');
      throw error; // Re-throw to trigger retry if message came from transport
    }
  });

  /**
   * Handle questionAdded events
   * Triggered when Chat module receives a user question
   */
  eventDispatcher.subscribe('questionAdded', async (data) => {
    try {
      fastify.log.info({ data }, '[AI] Received questionAdded event');
      
      if (!data) {
        throw new Error('Invalid event data: empty data');
      }
      
      const { userId, conversationId, prompt } = data;
      
      if (!userId || !conversationId || !prompt) {
        throw new Error(`Missing required fields: userId=${userId}, conversationId=${conversationId}, prompt=${!!prompt}`);
      }
      
      fastify.log.info(
        { userId, conversationId, promptLength: prompt.length },
        '[AI] Processing question'
      );
      
      // Create DI scope
      const diScope = fastify.diContainer?.createScope?.();
      
      // Create mock request/reply
      const mockRequest = {
        body: { conversationId, prompt },
        user: { id: userId },
        ...(diScope && { diScope })
      };
      
      const mockReply = {
        code: (code) => mockReply,
        send: (response) => response
      };

      // Call the controller
      if (typeof fastify.respondToPrompt === 'function') {
        const answer = await fastify.respondToPrompt(mockRequest, mockReply);

        if (answer) {
          // Extract text from various possible response formats
          let answerText;
          if (typeof answer === 'object') {
            answerText = 
              answer.response || 
              answer.content || 
              answer.text || 
              answer.answer || 
              answer.message || 
              answer.result ||
              answer.choices?.[0]?.message?.content || // OpenAI format
              answer.content?.text || // Anthropic format
              JSON.stringify(answer);
          } else {
            answerText = String(answer);
          }
          
          answerText = String(answerText);
        
          fastify.log.info(
            { conversationId, answerLength: answerText.length },
            '[AI] Generated answer'
          );
        
          // Emit answerAdded event (internal only, Chat module listens)
          eventDispatcher.emitInternal('answerAdded', {
            userId,
            conversationId,
            answer: answerText,
            timestamp: new Date().toISOString()
          });
        } else {
          fastify.log.warn({ conversationId }, '[AI] Failed to generate answer');
        }
      }
    } catch (error) {
      fastify.log.error({ err: error }, '[AI] Error processing questionAdded event');
      // Don't re-throw for in-memory events
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Transport Bridge (Redis/GCP Pub/Sub → internal eventBus)
  // ────────────────────────────────────────────────────────────────
  
  const transport = fastify.transport;
  const { getChannelName } = require('../../../messageChannels');
  const subscriptionName = getChannelName('git'); // AI listens to git events via transport

  fastify.log.info({ subscription: subscriptionName }, '[AI] Subscribing to transport');

  await transport.subscribe(subscriptionName, async (message) => {
    const { id, data } = message;
    
    fastify.log.info({ messageId: id, event: data?.event }, '[AI] Received transport message');
    
    try {
      if (!data || !data.event) {
        fastify.log.warn(
          { messageId: id, data },
          '[AI] Transport message missing event field, acking and ignoring'
        );
        await message.ack();
        return;
      }

      const { event, payload } = data;
      
      // Bridge to internal event bus
      eventDispatcher.emitInternal(event, payload);
      
      await message.ack();
    } catch (error) {
      fastify.log.error({ messageId: id, err: error }, '[AI] Error processing transport message');
      await message.nack();
    }
  });

  fastify.log.info({ subscription: subscriptionName }, '[AI] Subscribed to transport successfully');

  // ────────────────────────────────────────────────────────────────
  // Dev/Test Helpers
  // ────────────────────────────────────────────────────────────────
  
  if (process.env.NODE_ENV === 'development') {
    fastify.decorate('testRepoPush', async function(userId, repoId, repoData) {
      fastify.log.info('[AI Test] Emitting repoPushed event');
      eventDispatcher.emitInternal('repoPushed', { userId, repoId, repoData });
      return { success: true, message: 'Test event emitted' };
    });

    fastify.decorate('testQuestionAdded', async function(userId, conversationId, prompt) {
      fastify.log.info('[AI Test] Emitting questionAdded event');
      eventDispatcher.emitInternal('questionAdded', { userId, conversationId, prompt });
      return { success: true, message: 'Test event emitted' };
    });
  }

  fastify.log.info('✅ AI listeners registered successfully');
}, {
  name: 'aiPubsubListener',
  dependencies: ['eventDispatcher', 'transportPlugin', '@fastify/awilix']
});
