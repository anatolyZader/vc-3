// aiAssistService.js
/* eslint-disable no-unused-vars */
'use strict';

const AIResponse = require('../../domain/entities/aiResponse');

class AIAssistService {
  constructor(aiAssistPersistAdapter) {
    this.aiAssistPersistAdapter = aiAssistPersistAdapter;
  }

  async startConversation(userId) {
    const aiResponse = new AIResponse(userId);
    await aiResponse.startConversation(this.aiAssistPersistAdapter);
    return aiResponse.conversationId;
  }

  async respondToPrompt(userId, prompt) {
    const aiResponse = new AIResponse(userId);
    return await aiResponse.respondToPrompt(prompt, this.aiAssistPersistAdapter);
  }
}

module.exports = AIAssistService;
