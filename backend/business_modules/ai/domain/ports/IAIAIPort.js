// IAIAIPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIAIPort {
  constructor() {
    if (new.target === IAIAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async respondToPrompt(userId, conversationId, prompt) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIAIPort;
