// infrastructure/ai/aiLangchainAdapter.js
'use strict';

const IAIAIPort = require('../../domain/ports/IAIAIPort');

class aiLangchainAdapter extends IAIAIPort {
  constructor() {
    super();

  }

  async respondToPrompt(userId, conversationId, prompt) {
    const aiResponse = `Generated AI response for: ${prompt}`;
    console.log(`Fetched AI response: ${aiResponse}`);
    return aiResponse;
  }
}

module.exports = aiLangchainAdapter;