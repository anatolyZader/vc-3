const ConversationRenamedEvent = require('../conversationRenamedEvent');

describe('ConversationRenamedEvent', () => {
  test('creates event', () => {
    const evt = new ConversationRenamedEvent({ userId: 'u', conversationId: 'c', newTitle: 'N' });
    expect(evt.newTitle).toBe('N');
    expect(evt.userId).toBe('u');
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
