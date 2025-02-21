// aiAssistService.js
/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-vars */
'use strict';

const AIResponse = require('../../domain/entities/aiResponse');

const pubsubTopics = require('../../../messaging/pubsub/aiAssistPubsubTopics');

class AIAssistService {

  constructor(aiAssistPersistAdapter, aiAssistMessagingAdapter) {
    this.aiAssistPersistAdapter = aiAssistPersistAdapter;
    this.aiAssistMessagingAdapter = aiAssistMessagingAdapter;
  }

  async startConversation(userId) {
    const aiResponse = new AIResponse(userId);
    await aiResponse.startConversation(this.aiAssistPersistAdapter);

    // Publish the AI conversation started event.
    await this.aiAssistMessagingAdapter.publish(pubsubTopics.AI_CONVERSATION_STARTED, {
      conversationId: aiResponse.conversationId,
      userId,
    });

    return aiResponse.conversationId;
  }

  async respondToPrompt(userId, prompt) {
    const aiResponse = new AIResponse(userId);
    const response = await aiResponse.respondToPrompt(prompt, this.aiAssistPersistAdapter);

    // Publish the AI prompt responded event.
    await this.aiAssistMessagingAdapter.publish(pubsubTopics.AI_PROMPT_RESPONDED, {
      conversationId: aiResponse.conversationId,
      userId,
      prompt,
      response,
    });

    return response;
  }
}

module.exports = AIAssistService;
