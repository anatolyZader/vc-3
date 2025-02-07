/* eslint-disable no-unused-vars */
'use strict';

class IAIAssistService {
  constructor() {
    if (new.target === IAIAssistService) {
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

module.exports = IAIAssistService;