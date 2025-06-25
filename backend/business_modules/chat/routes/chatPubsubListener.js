/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubsubClient');
  const subscriptionName = 'chat-sub';
  const subscription = pubSubClient.subscription(subscriptionName);
  
  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
    // Depending on the error, you might want to re-initialize the subscription
    // or implement a more sophisticated back-off and retry strategy here.
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received CHAT message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'aiResponseReceived') {
        const { userId, conversationId, response } = data.payload; 
        fastify.log.info(`chat module is receiving response from ai module for user: ${userId}, conversation: ${conversationId}`);

        if (typeof fastify.addAnswer === 'function') {
          // Create a mock request object that matches what the HTTP handler expects
          const mockRequest = {
            body: { aiResponse: response },  
            params: { conversationId },  
            user: { id: userId }
          };
          
          const mockReply = {}; 
     
          await fastify.addAnswer(mockRequest, mockReply); // ✅ Fixed: pass the request and reply objects
          fastify.log.info(`AI answer added to chat conversation ${conversationId}.`);
        } else {
          fastify.log.error(`fastify.addAnswer is not defined.`);
          message.nack(); // Nack if the handler isn't available
          return;
        }
      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing CHAT message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });  

  fastify.log.info(`Listening for CHAT messages on Pub/Sub subscription: ${subscriptionName}...`);

  // It's good practice to ensure the subscription is closed when the Fastify app closes.
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(chatPubsubListener);