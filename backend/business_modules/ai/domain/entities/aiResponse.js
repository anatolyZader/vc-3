// aiResponse.js
/* eslint-disable no-unused-vars */
'use strict';

class AIResponse {
  constructor(userId) {
    this.userId = userId;   
  }

  async respondToPrompt(conversationId, prompt, preFetchedRepo, preFetchedWiki, IAIAIPort) {
    const response = await IAIPort.respondToPrompt(conversationId, prompt, preFetchedRepo, preFetchedWiki);
    console.log(`AI Response received: ${response}`);
    return response;
  }
}

module.exports = AIResponse;
