const ConversationId = require('../../../../../business_modules/chat/domain/value_objects/conversationId');

describe('Chat domain ConversationId', () => {
  test('valid', () => {
    const id = new ConversationId('abc');
    expect(id.toString()).toBe('abc');
  });
  test('invalid', () => {
    expect(() => new ConversationId()).toThrow('Invalid ConversationId');
  });
  test('equality', () => {
    const id1 = new ConversationId('1');
    const id2 = new ConversationId('1');
    expect(id1.equals(id2)).toBe(true);
  });
});
