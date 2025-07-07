// aiResponse.js
/* eslint-disable no-unused-vars */
'use strict';

class AIResponse {
  constructor(userId) {
    this.userId = userId;   
  }

  async respondToPrompt(userId, conversationId, prompt, IAIPort) {
    const response = await IAIPort.respondToPrompt(userId, conversationId, prompt);
    console.log(`AI Response received: ${response}`);
    return response;
  }
}

module.exports = AIResponse;
