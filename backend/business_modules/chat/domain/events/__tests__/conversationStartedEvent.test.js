const ConversationStartedEvent = require('../conversationStartedEvent');

describe('ConversationStartedEvent', () => {
  test('creates event with defaults', () => {
    const evt = new ConversationStartedEvent({ userId: 'u', conversationId: 'c', title: 'T' });
    expect(evt.userId).toBe('u');
    expect(evt.title).toBe('T');
    expect(evt.conversationId).toBe('c');
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
