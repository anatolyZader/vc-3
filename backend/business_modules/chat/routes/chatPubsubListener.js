'use strict';

const fp = require('fastify-plugin');

async function chatPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'chat-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received chat message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'startConversation') {
        const { userId, title, correlationId } = data.payload;
        fastify.log.info(`Processing startConversation event for user: ${userId}, correlation: ${correlationId}`);

        if (typeof fastify.startConversation === 'function') {
          // Create mock request object for startConversation
          const mockRequest = {
            body: { title },
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const conversationId = await fastify.startConversation(mockRequest, mockReply);
          
          fastify.log.info(`Conversation started via PubSub: ${conversationId}`);
          
          // Publish the result event
          const chatPubsubAdapter = await fastify.diContainer.resolve('chatPubsubAdapter');
          await chatPubsubAdapter.publishConversationStartedEvent({ conversationId, userId }, correlationId);
          
          fastify.log.info(`Conversation start result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.startConversation is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'fetchConversation') {
        const { userId, conversationId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchConversation event for user: ${userId}, conversation: ${conversationId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchConversation === 'function') {
          // Create mock request object for fetchConversation
          const mockRequest = {
            params: { conversationId },
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const conversation = await fastify.fetchConversation(mockRequest, mockReply);
          
          fastify.log.info(`Conversation fetched via PubSub: ${JSON.stringify(conversation)}`);
          
          // Publish the result event
          const chatPubsubAdapter = await fastify.diContainer.resolve('chatPubsubAdapter');
          await chatPubsubAdapter.publishConversationFetchedEvent(conversation, correlationId);
          
          fastify.log.info(`Conversation fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchConversation is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'addQuestion') {
        const { userId, conversationId, prompt, correlationId } = data.payload;
        fastify.log.info(`Processing addQuestion event for user: ${userId}, conversation: ${conversationId}, correlation: ${correlationId}`);

        if (typeof fastify.addQuestion === 'function') {
          // Create mock request object for addQuestion
          const mockRequest = {
            params: { conversationId },
            body: { prompt },
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const questionId = await fastify.addQuestion(mockRequest, mockReply);
          
          fastify.log.info(`Question added via PubSub: ${questionId}`);
          
          // Publish the result event
          const chatPubsubAdapter = await fastify.diContainer.resolve('chatPubsubAdapter');
          await chatPubsubAdapter.publishQuestionAddedEvent({ questionId, conversationId, userId }, correlationId);
          
          fastify.log.info(`Question add result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.addQuestion is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'addAnswer') {
        const { userId, conversationId, aiResponse, correlationId } = data.payload;
        fastify.log.info(`Processing addAnswer event for user: ${userId}, conversation: ${conversationId}, correlation: ${correlationId}`);

        if (typeof fastify.addAnswer === 'function') {
          // Create mock request object for addAnswer
          const mockRequest = {
            params: { conversationId },
            body: { aiResponse },
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const answerId = await fastify.addAnswer(mockRequest, mockReply);
          
          fastify.log.info(`Answer added via PubSub: ${answerId}`);
          
          // Publish the result event
          const chatPubsubAdapter = await fastify.diContainer.resolve('chatPubsubAdapter');
          await chatPubsubAdapter.publishAnswerAddedEvent({ answerId, conversationId, userId }, correlationId);
          
          fastify.log.info(`Answer add result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.addAnswer is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'fetchConversationsHistory') {
        const { userId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchConversationsHistory event for user: ${userId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchConversationsHistory === 'function') {
          // Create mock request object for fetchConversationsHistory
          const mockRequest = {
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const history = await fastify.fetchConversationsHistory(mockRequest, mockReply);
          
          fastify.log.info(`Conversations history fetched via PubSub: ${JSON.stringify(history)}`);
          
          // Publish the result event
          const chatPubsubAdapter = await fastify.diContainer.resolve('chatPubsubAdapter');
          await chatPubsubAdapter.publishConversationsHistoryFetchedEvent(history, correlationId);
          
          fastify.log.info(`Conversations history fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchConversationsHistory is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing chat message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });

  fastify.log.info(`Listening for Chat messages on Pub/Sub subscription: ${subscriptionName}...`);

  // Ensure the subscription is closed when the Fastify app closes
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(chatPubsubListener);