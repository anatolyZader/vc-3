const ConversationStartedEvent = require('../../../../../business_modules/chat/domain/events/conversationStartedEvent');

describe('Chat domain ConversationStartedEvent', () => {
  test('construct', () => {
    const e = new ConversationStartedEvent({ userId: 'u', conversationId: 'c', title: 'T' });
    expect(e.userId).toBe('u');
    expect(e.conversationId).toBe('c');
    expect(e.title).toBe('T');
    expect(e.occurredAt).toBeInstanceOf(Date);
  });
});
