// IAIPersistPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIPersistPort {
  constructor() {
    if (new.target === IAIPersistPort) {
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

module.exports = IAIPersistPort;
