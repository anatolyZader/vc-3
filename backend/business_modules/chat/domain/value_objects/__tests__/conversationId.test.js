const ConversationId = require('../conversationId');

describe('ConversationId Value Object', () => {
  test('creates valid ConversationId', () => {
    const id = new ConversationId('conv-1');
    expect(id.value).toBe('conv-1');
    expect(id.toString()).toBe('conv-1');
  });

  test('throws on invalid input', () => {
    expect(() => new ConversationId()).toThrow('Invalid ConversationId');
    expect(() => new ConversationId(123)).toThrow('Invalid ConversationId');
  });

  test('equality works', () => {
    const a = new ConversationId('c');
    const b = new ConversationId('c');
    const c = new ConversationId('d');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
