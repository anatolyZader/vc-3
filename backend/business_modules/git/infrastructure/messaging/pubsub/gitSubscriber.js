'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');

const subscriptionName = 'git-subscription'; // Ensure this subscription exists for the 'git' topic in GCP
const timeout = 60; // seconds

// Event handler mapping for Git events.
const eventHandlers = {
  repositoryFetched: (payload) => {
    console.log('Handling repositoryFetched event:', payload);
    // Add custom logic for a fetched repository event here.
  },
  repositoryAnalyzed: (payload) => {
    console.log('Handling repositoryAnalyzed event:', payload);
    // Add custom logic for an analyzed repository event here.
  }
};

function listenForGitEvents() {
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
      // Acknowledge successful processing.
      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      // Signal failure so the message can be retried or sent to a dead-letter queue.
      message.nack();
    }
  };

  // Start listening for messages.
  subscription.on('message', messageHandler);
  console.log(`Listening for messages on subscription: ${subscriptionName}...`);

  // Optional: Stop listening after a timeout (for testing or controlled shutdown).
  setTimeout(() => {
    subscription.removeListener('message', messageHandler);
    console.log('Stopped listening for messages.');
  }, timeout * 1000);
}

// Start the Git subscriber.
listenForGitEvents();
