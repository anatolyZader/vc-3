const ConversationDeletedEvent = require('../../../../../business_modules/chat/domain/events/conversationDeletedEvent');

describe('Chat domain ConversationDeletedEvent', () => {
  test('construct', () => {
    const e = new ConversationDeletedEvent({ userId: 'u', conversationId: 'c' });
    expect(e.userId).toBe('u');
    expect(e.conversationId).toBe('c');
    expect(e.occurredAt).toBeInstanceOf(Date);
  });
});
