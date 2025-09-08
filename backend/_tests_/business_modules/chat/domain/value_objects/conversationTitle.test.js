const ConversationTitle = require('../../../../../business_modules/chat/domain/value_objects/conversationTitle');

describe('Chat domain ConversationTitle', () => {
  test('valid', () => {
    const t = new ConversationTitle('Title');
    expect(t.toString()).toBe('Title');
  });
  test('invalid', () => {
    expect(() => new ConversationTitle()).toThrow('Invalid conversation title.');
  });
  test('equality', () => {
    const t1 = new ConversationTitle('Same');
    const t2 = new ConversationTitle('Same');
    expect(t1.equals(t2)).toBe(true);
  });
});
