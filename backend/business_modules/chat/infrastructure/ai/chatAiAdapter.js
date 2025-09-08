/* eslint-disable no-unused-vars */
'use strict';

const IChatAiPort = require('../../domain/ports/IChatAiPort');
const OpenAI = require('openai');

class ChatAiAdapter extends IChatAiPort {
  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY;
    this.client = new OpenAI({ apiKey: this.apiKey });
  }


  async nameConversation({ userId, conversationId, prompts }) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return 'New Conversation';
    }

    // Build a compact instruction
    const joined = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const system = 'You create short, descriptive chat titles. Return only the title, at most 5 words, no quotes, no punctuation at the end.';
    const user = `Summarize the meaning of these prompts into a concise chat title (max 5 words):\n${joined}`;

    try {
      // Prefer responses with minimal tokens; use modern responses API if available
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.3,
        max_tokens: 16
      });

      const text = response?.choices?.[0]?.message?.content || '';
      return (text || '').trim();
    } catch (err) {
      console.error('OpenAI nameConversation error:', err?.message || err);
      return 'Untitled Chat';
    }
  }
}

module.exports = ChatAiAdapter;
