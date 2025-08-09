const ConversationRenamedEvent = require('../../../../../business_modules/chat/domain/events/conversationRenamedEvent');

describe('Chat domain ConversationRenamedEvent', () => {
  test('construct', () => {
    const e = new ConversationRenamedEvent({ userId: 'u', conversationId: 'c', newTitle: 'T' });
    expect(e.userId).toBe('u');
    expect(e.conversationId).toBe('c');
    expect(e.newTitle).toBe('T');
    expect(e.occurredAt).toBeInstanceOf(Date);
  });
});
