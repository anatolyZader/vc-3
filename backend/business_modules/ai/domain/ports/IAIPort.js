// IAIPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIPort {
  constructor() {
    if (new.target === IAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async processPushedRepo(userId, repoId, repoData) {
    throw new Error('Method not implemented.');
  }  

  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    throw new Error('Method not implemented.');
  }

}

module.exports = IAIPort;
