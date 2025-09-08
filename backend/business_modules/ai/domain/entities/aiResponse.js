// aiResponse.js
/* eslint-disable no-unused-vars */

'use strict';

const AiResponseGeneratedEvent = require('../events/aiResponseGeneratedEvent');
const UserId = require('../value_objects/userId');
const Prompt = require('../value_objects/prompt');

class AIResponse {
  constructor(userId) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    this.userId = userId;
  }

  async respondToPrompt(userId, conversationId, prompt, IAIPort, conversationHistory = []) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    if (!(prompt instanceof Prompt)) throw new Error('prompt must be a Prompt value object');
    const response = await IAIPort.respondToPrompt(userId.value, conversationId, prompt.text, conversationHistory);
    console.log(`AI Response received: ${response}`);
    // Emit domain event
    const event = new AiResponseGeneratedEvent({
      userId: userId.value,
      conversationId,
      prompt: prompt.text,
      response
    });
    return { response, event };
  }
}

module.exports = AIResponse;
