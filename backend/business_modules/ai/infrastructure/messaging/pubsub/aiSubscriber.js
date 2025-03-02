'use strict';

const pubSubClient = require('../../../../aop_modules/messaging/pubsub/pubsubClient');
const subscriptionName = 'ai-subscription'; // Ensure this subscription exists for the 'ai' topic in GCP
const timeout = 60; // seconds

// Event handler mapping for AI events.
const eventHandlers = {
  aiResponded: (payload) => {
    console.log('Handling aiResponded event:', payload);
    // Add custom processing logic for the AI response event here.
  }
};

function listenForAiEvents() {
  const subscription = pubSubClient.subscription(subscriptionName);

  const messageHandler = (message) => {
    console.log(`Received message ${message.id}`);
    console.log(`Data: ${message.data}`);
    console.log(`Attributes: ${JSON.stringify(message.attributes)}`);
    
    try {
      const payload = JSON.parse(message.data.toString());
      const handler = eventHandlers[payload.event];
      if (handler) {
        handler(payload);
      } else {
        console.warn(`No handler for event: ${payload.event}`);
      }
      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  console.log(`Listening for messages on subscription: ${subscriptionName}...`);

  // Optional: Stop listening after a timeout (for testing purposes).
  setTimeout(() => {
    subscription.removeListener('message', messageHandler);
    console.log('Stopped listening for messages.');
  }, timeout * 1000);
}

// Start listening for AI events.
listenForAiEvents();
