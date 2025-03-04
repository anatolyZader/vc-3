// GitLangchainAdapter.js
'use strict';
'use strict';

const { PubSub } = require('@google-cloud/pubsub');
const { v4: uuidv4 } = require('uuid');

class GitLangchainAdapter {
  constructor() {
    // Initialize the Pub/Sub client.
    this.pubsub = new PubSub();

    // Define the Pub/Sub topic to which analysis requests are published
    // and the subscription for receiving analysis responses.
    this.requestTopicName = 'ai-analysis-request';
    this.responseSubscriptionName = 'ai-analysis-response-sub';
  }

  async analyzeRepository(userId, repositoryId) {
    console.log(`Analyzing repository with ID: ${repositoryId}`);

    // Generate a unique correlation ID for this request.
    const correlationId = uuidv4();

    // Build the message payload.
    const messagePayload = {
      userId,
      repositoryId,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    const dataBuffer = Buffer.from(JSON.stringify(messagePayload));

    // Publish the request to the analysis topic.
    const messageId = await this.pubsub
      .topic(this.requestTopicName)
      .publish(dataBuffer);
    console.log(
      `Published message with ID: ${messageId} and correlationId: ${correlationId}`
    );

    // Wait for the analysis response from the ai_business_module.
    try {
      const analysisResult = await this.waitForResponse(correlationId);
      console.log(`Received analysis result for repository: ${repositoryId}`);
      return analysisResult;
    } catch (error) {
      console.error(`Error receiving analysis result: ${error.message}`);
      throw error;
    }
  }

  waitForResponse(correlationId) {
    return new Promise((resolve, reject) => {
      const subscription = this.pubsub.subscription(
        this.responseSubscriptionName
      );

      // Message handler to process incoming responses.
      const messageHandler = (message) => {
        try {
          const data = JSON.parse(message.data.toString());
          // Check for matching correlationId.
          if (data.correlationId === correlationId) {
            console.log(`Matched response for correlationId: ${correlationId}`);
            message.ack();
            subscription.removeListener('message', messageHandler);
            resolve(data);
          } else {
            // If this isn't the intended message, let it be re-delivered.
            message.nack();
          }
        } catch (err) {
          console.error('Error processing message:', err);
          message.nack();
        }
      };

      subscription.on('message', messageHandler);

      // Set a timeout for the response.
      const timeoutMs = 30000; // 30 seconds
      setTimeout(() => {
        subscription.removeListener('message', messageHandler);
        reject(new Error('Timeout waiting for analysis result'));
      }, timeoutMs);
    });
  }
}

module.exports = GitLangchainAdapter;
