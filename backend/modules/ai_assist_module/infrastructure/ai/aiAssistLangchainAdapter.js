// infrastructure/ai/aiAssistLangchainAdapter.js
'use strict';

const { Pool } = require('pg');
const IAIAssistAIPort = require('../../domain/ports/IAIAssistAIPort');

class aiAssistLangchainAdapter extends IAIAssistAIPort {
  constructor() {
    super();
    this.pool = new Pool({
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
    });
  }

  async respondToPrompt(prompt) {
    // Simulate calling LangChain for AI response
    const aiResponse = `Generated AI response for: ${prompt}`;
    console.log(`Fetched AI response: ${aiResponse}`);
    return aiResponse;
  }
}

module.exports = aiAssistLangchainAdapter;