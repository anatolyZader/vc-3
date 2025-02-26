/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const IAIResponsePersistPort = require('../ports/IAIPersistPort');

class AIResponse {
  constructor(userId) {
    this.userId = userId;
    this.conversationId = uuidv4();
  }

  async startConversation(IAIResponsePersistPort) {
    const newConversation = {
      conversationId: this.conversationId,
      startDate: new Date(),
    };
    await IAIResponsePersistPort.startConversation(this.userId, newConversation);
    console.log(`AI conversation ${newConversation.conversationId} started for user ${this.userId}.`);
  }

  async respondToPrompt(prompt, IAIResponsePersistPort) {
    const response = await IAIResponsePersistPort.respondToPrompt(prompt);
    console.log(`AI Response received: ${response}`);
    return response;
  }
}

module.exports = AIResponse;
