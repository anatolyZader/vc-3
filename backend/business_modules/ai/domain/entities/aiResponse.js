/* eslint-disable no-unused-vars */
'use strict';

const IAIAIPort = require('../ports/IAIAIPort');

class AIResponse {
  constructor(userId) {
    this.userId = userId;   
  }

  async respondToPrompt(conversationId, prompt,preFetchedRepo, preFetchedWiki, IAIAIPort) {
    const response = await IAIAIPort.respondToPrompt(this.userId, conversationId, prompt, preFetchedRepo, preFetchedWiki);
    console.log(`AI Response received: ${response}`);
    return response;
  }
}

module.exports = AIResponse;
