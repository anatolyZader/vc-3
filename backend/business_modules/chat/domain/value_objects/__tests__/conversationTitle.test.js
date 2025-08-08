const ConversationTitle = require('../conversationTitle');

describe('ConversationTitle Value Object', () => {
  test('creates valid title', () => {
    const t = new ConversationTitle(' My Chat ');
    expect(t.title).toBe('My Chat');
    expect(t.toString()).toBe('My Chat');
  });

  test('throws on invalid', () => {
    expect(() => new ConversationTitle()).toThrow('Invalid conversation title.');
    expect(() => new ConversationTitle(123)).toThrow('Invalid conversation title.');
  });

  test('equality works', () => {
    const a = new ConversationTitle('Chat');
    const b = new ConversationTitle('Chat');
    const c = new ConversationTitle('Other');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
