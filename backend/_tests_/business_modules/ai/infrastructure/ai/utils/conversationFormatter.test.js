'use strict';

const path = require('path');

describe('ConversationFormatter utility', () => {
  let ConversationFormatter;

  beforeEach(() => {
    jest.resetModules();
    ConversationFormatter = require(path.resolve(__dirname, '../../../../../../business_modules/ai/infrastructure/ai/utils/conversationFormatter.js'));
  });

  test('formats history into alternating user/assistant messages', () => {
    const history = [
      { prompt: 'Hi', response: 'Hello!' },
      { prompt: 'How are you?', response: 'Great.' }
    ];
    const messages = ConversationFormatter.formatConversationHistory(history);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(4);
    expect(messages[0]).toEqual({ role: 'user', content: 'Hi' });
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Hello!' });
    expect(messages[2]).toEqual({ role: 'user', content: 'How are you?' });
    expect(messages[3]).toEqual({ role: 'assistant', content: 'Great.' });
  });

  test('returns empty array for empty or missing history', () => {
    expect(ConversationFormatter.formatConversationHistory([])).toEqual([]);
    expect(ConversationFormatter.formatConversationHistory(null)).toEqual([]);
  });
});
