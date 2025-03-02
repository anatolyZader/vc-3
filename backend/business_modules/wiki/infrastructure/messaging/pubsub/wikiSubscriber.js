'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');

const subscriptionName = 'wiki-subscription'; // Ensure this subscription exists for the 'wiki' topic in GCP
const timeout = 60; // seconds

// Define an event handler mapping for wiki events.
const eventHandlers = {
  pageCreated: (payload) => {
    console.log('Handling pageCreated event:', payload);
    // Add your custom logic for pageCreated events here.
  },
  pageFetched: (payload) => {
    console.log('Handling pageFetched event:', payload);
    // Add your custom logic for pageFetched events here.
  },
  pageUpdated: (payload) => {
    console.log('Handling pageUpdated event:', payload);
    // Add your custom logic for pageUpdated events here.
  },
  pageAnalyzed: (payload) => {
    console.log('Handling pageAnalyzed event:', payload);
    // Add your custom logic for pageAnalyzed events here.
  },
  pageDeleted: (payload) => {
    console.log('Handling pageDeleted event:', payload);
    // Add your custom logic for pageDeleted events here.
  }
};

function listenForWikiEvents() {
  const subscription = pubSubClient.subscription(subscriptionName);

  const messageHandler = (message) => {
    console.log(`Received message ${message.id}:`);
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

  // Optional: Stop listening after a timeout to avoid indefinite execution during testing.
  setTimeout(() => {
    subscription.removeListener('message', messageHandler);
    console.log('Stopped listening for messages.');
  }, timeout * 1000);
}

// Start the subscriber
listenForWikiEvents();
