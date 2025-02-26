/* eslint-disable no-unused-vars */
'use strict';

class IAIService {
  constructor() {
    if (new.target === IAIService) {
      throw new Error('Cannot instantiate an interface.');
    }
  }

  async startConversation(userId) {
    throw new Error('Method not implemented.');
  }

  async respondToPrompt(userId, prompt) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIService;