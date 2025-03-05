// aiPubsubListener.js

'use strict';

const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');
const subscriptionName = 'ai-sub'; // Ensure this subscription is set up in GCP
const timeout = 60; // seconds

// Import your service (or use dependency injection if available)
const aiService = require('../../s/business_modules/aiService');

function listenForAiMessages() {
  const subscription = pubSubClient.subscription(subscriptionName);

  const messageHandler = async (message) => {
    console.log(`Received message ${message.id}`);
    try {
      const data = JSON.parse(message.data.toString());
      // Assume the payload contains an action identifier and the necessary parameters.
      if (data.action === 'respondToPrompt') {
        // Extract parameters from the payload.
        const { userId, conversationId, prompt } = data;
        // Invoke the business logic.
        const response = await aiService.respondToPrompt(userId, conversationId, prompt);
        console.log(`AI response: ${response}`);
      } else {
        console.warn(`Unknown action: ${data.action}`);
      }
      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  console.log(`Listening for AI messages on subscription: ${subscriptionName}...`);

  // Optional: Shutdown listener after a timeout (for testing purposes).
  setTimeout(() => {
    subscription.removeListener('message', messageHandler);
    console.log('Stopped listening for messages.');
  }, timeout * 1000);
}

module.exports = { listenForAiMessages };
