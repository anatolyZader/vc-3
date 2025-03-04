'use strict';

const pubSubClient = require('../../../../aop_modules/messaging/pubsub/pubsubClient');
const aiService = require('../../app/modules/ai_business_module/aiService');
const subscriptionName = 'ai-subscription'; // Ensure this subscription exists in GCP

const eventHandlers = {
  async questionSent(payload) {
    console.log('Handling questionSent event:', payload);

    const { userId, conversationId, prompt } = payload;

    try {
      await aiService.respondToPrompt(userId, conversationId, prompt, async (chunk) => {
        const streamingPayload = {
          event: 'aiStreamingChunk',
          userId,
          conversationId,
          chunk,
        };

        await publishToPubSub('chat', streamingPayload);
      });

      // Notify when the response is fully processed
      await publishToPubSub('chat', {
        event: 'aiResponded',
        userId,
        conversationId,
        complete: true,
      });
    } catch (error) {
      console.error('Error handling AI response:', error);
    }
  },
};

async function publishToPubSub(topic, payload) {
  try {
    const topicRef = pubSubClient.topic(topic);
    const messageBuffer = Buffer.from(JSON.stringify(payload));
    await topicRef.publishMessage({ data: messageBuffer });
    console.log(`Published streaming chunk to topic ${topic}`);
  } catch (error) {
    console.error(`Error publishing to topic ${topic}:`, error);
  }
}

function listenForAiEvents() {
  const subscription = pubSubClient.subscription(subscriptionName);

  const messageHandler = async (message) => {
    console.log(`Received message ${message.id}`);
    
    try {
      const payload = JSON.parse(message.data.toString());
      const handler = eventHandlers[payload.event];
      if (handler) {
        await handler(payload);
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
}

listenForAiEvents();
