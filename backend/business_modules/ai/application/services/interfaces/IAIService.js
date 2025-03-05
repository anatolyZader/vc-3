/* eslint-disable no-unused-vars */
'use strict';

class IAIService {
  constructor() {
    if (new.target === IAIService) {
      throw new Error('Cannot instantiate an interface.');
    }
  }

  async respondToPrompt(userId, conversationId, prompt, repoId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IAIService;
