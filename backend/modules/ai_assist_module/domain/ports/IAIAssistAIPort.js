// IAIAssistAIPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIAssistAIPort {
  constructor() {
    if (new.target === IAIAssistAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async respondToPrompt(prompt) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIAssistAIPort;
