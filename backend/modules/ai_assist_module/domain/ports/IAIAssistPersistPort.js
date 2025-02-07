// IAIAssistPersistPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIAssistPersistPort {
  constructor() {
    if (new.target === IAIAssistPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async startConversation(userId, newConversation) {
    throw new Error('Method not implemented.');
  }

  async respondToPrompt(prompt) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIAssistPersistPort;
