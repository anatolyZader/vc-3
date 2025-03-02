'use strict';

const pubSubClient = require('../../../../../aop_modules/messaging/pubsub/pubsubClient');

const subscriptionName = 'chat-subscription'; // Ensure this subscription exists for the 'chat' topic in GCP
const timeout = 60; // seconds

// Map chat event names to their handler functions.
const eventHandlers = {
  conversationStarted: (payload) => {
    console.log('Handling conversationStarted event:', payload);
    // Add custom logic to process a new conversation.
  },
  conversationRenamed: (payload) => {
    console.log('Handling conversationRenamed event:', payload);
    // Add custom logic to process a conversation rename.
  },
  conversationDeleted: (payload) => {
    console.log('Handling conversationDeleted event:', payload);
    // Add custom logic to process a deleted conversation.
  },
  questionSent: (payload) => {
    console.log('Handling questionSent event:', payload);
    // Add custom logic to process a sent question.
  },
  answerSent: (payload) => {
    console.log('Handling answerSent event:', payload);
    // Add custom logic to process a sent answer.
  }
};

function listenForChatEvents() {
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
      // Acknowledge the message after processing.
      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      // Negative acknowledgment to signal that the message wasn't processed successfully.
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  console.log(`Listening for messages on subscription: ${subscriptionName}...`);

  // Optional: Stop listening after a timeout (useful for testing or controlled shutdown).
  setTimeout(() => {
    subscription.removeListener('message', messageHandler);
    console.log('Stopped listening for messages.');
  }, timeout * 1000);
}

// Start listening for chat events.
listenForChatEvents();
