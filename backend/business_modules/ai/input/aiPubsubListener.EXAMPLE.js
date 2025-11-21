// Example: Refactored AI Pubsub Listener
// Uses generic transport for subscriptions instead of GCP-specific code
'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiPubsubListener(fastify, opts) {
  fastify.log.info('🤖 Setting up AI Pub/Sub listeners...');
  
  // Get transport from fastify (injected by transportPlugin)
  const transport = fastify.transport;
  
  // Subscription name for this module (matches your GCP subscription)
  const subscriptionName = 'git-sub'; // AI module listens to git events
  
  // Subscribe to messages
  await transport.subscribe(subscriptionName, async (message) => {
    try {
      const { data } = message;
      
      fastify.log.info({ messageId: message.id, event: data.event }, 'AI module received message');
      
      // Handle different event types
      switch (data.event) {
        case 'repoPushed':
          await handleRepoPushed(fastify, data, message);
          break;
          
        case 'questionAdded':
          await handleQuestionAdded(fastify, data, message);
          break;
          
        default:
          fastify.log.warn({ event: data.event }, 'Unknown event type');
          await message.ack(); // Ack unknown events to prevent redelivery
      }
      
    } catch (error) {
      fastify.log.error({ error, messageId: message.id }, 'Error processing message');
      await message.nack(); // Nack on error to trigger retry
    }
  });
  
  fastify.log.info(`✅ AI module subscribed to: ${subscriptionName}`);
  
}, {
  name: 'aiPubsubListener',
  dependencies: ['transportPlugin'] // Ensure transport is loaded first
});

/**
 * Handle repoPushed event
 */
async function handleRepoPushed(fastify, data, message) {
  const { userId, repoId, repoData } = data;
  
  fastify.log.info({ userId, repoId }, 'Processing repoPushed event');
  
  // Validate required fields
  if (!userId || !repoId) {
    fastify.log.error('Missing userId or repoId in repoPushed event');
    await message.ack(); // Ack malformed messages
    return;
  }
  
  // Create DI scope for this request
  const diScope = fastify.diContainer.createScope();
  
  // Initialize text search if needed
  try {
    const aiService = await diScope.resolve('aiService');
    const postgresAdapter = await diScope.resolve('aiPersistAdapter');
    
    if (aiService && postgresAdapter && aiService.aiAdapter) {
      if (!aiService.aiAdapter.textSearchService) {
        fastify.log.info('Initializing text search...');
        await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
      }
    }
  } catch (initError) {
    fastify.log.error({ error: initError }, 'Text search initialization failed');
  }
  
  // Create mock request/reply for controller
  const mockRequest = {
    body: { repoId, repoData },
    user: { id: userId },
    diScope: diScope
  };
  
  const mockReply = {
    code: (code) => mockReply,
    send: (response) => response
  };
  
  // Call controller
  if (typeof fastify.processPushedRepo === 'function') {
    const result = await fastify.processPushedRepo(mockRequest, mockReply);
    
    if (result && result.success) {
      fastify.log.info({ repoId, chunksStored: result.chunksStored }, 'Repository processed successfully');
      
      // Publish repoProcessed event using transport
      const aiPubsubAdapter = await diScope.resolve('aiPubsubAdapter');
      await aiPubsubAdapter.publishRepoProcessed(userId, repoId, result);
      
      await message.ack();
    } else {
      fastify.log.warn({ repoId }, 'Failed to process repository');
      await message.nack();
    }
  } else {
    fastify.log.error('processPushedRepo function not found');
    await message.nack();
  }
}

/**
 * Handle questionAdded event
 */
async function handleQuestionAdded(fastify, data, message) {
  const { userId, conversationId, prompt } = data;
  
  fastify.log.info({ userId, conversationId }, 'Processing questionAdded event');
  
  // Validate required fields
  if (!userId || !conversationId || !prompt) {
    fastify.log.error('Missing required fields in questionAdded event');
    await message.ack(); // Ack malformed messages
    return;
  }
  
  // Create DI scope
  const diScope = fastify.diContainer.createScope();
  
  // Create mock request/reply
  const mockRequest = {
    body: { conversationId, prompt },
    user: { id: userId },
    diScope: diScope
  };
  
  const mockReply = {
    code: (code) => mockReply,
    send: (response) => response
  };
  
  // Call controller
  if (typeof fastify.respondToPrompt === 'function') {
    const answer = await fastify.respondToPrompt(mockRequest, mockReply);
    
    if (answer) {
      // Extract answer text (handle various response formats)
      let answerText = extractAnswerText(answer);
      
      fastify.log.info({ conversationId, answerLength: answerText.length }, 'Generated answer');
      
      // Publish answerAdded event using transport
      const aiPubsubAdapter = await diScope.resolve('aiPubsubAdapter');
      await aiPubsubAdapter.publishAnswerAdded(userId, conversationId, answerText);
      
      await message.ack();
    } else {
      fastify.log.warn({ conversationId }, 'Failed to generate answer');
      await message.nack();
    }
  } else {
    fastify.log.error('respondToPrompt function not found');
    await message.nack();
  }
}

/**
 * Extract answer text from various response formats
 */
function extractAnswerText(answer) {
  if (typeof answer === 'string') {
    return answer;
  }
  
  if (typeof answer === 'object') {
    // Try common properties
    const text = answer.response || answer.content || answer.text || 
                 answer.answer || answer.message || answer.result;
    
    if (text && typeof text === 'string') {
      return text;
    }
    
    // OpenAI format
    if (answer.choices && answer.choices[0] && answer.choices[0].message && answer.choices[0].message.content) {
      return answer.choices[0].message.content;
    }
    
    // Anthropic format
    if (answer.content && typeof answer.content === 'object' && answer.content.text) {
      return answer.content.text;
    }
    
    // Last resort - stringify
    return JSON.stringify(answer);
  }
  
  return String(answer);
}
