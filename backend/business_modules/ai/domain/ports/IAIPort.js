// IAIPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIPort {
  constructor() {
    if (new.target === IAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async respondToPrompt(userId, conversationId, prompt) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIPort;
