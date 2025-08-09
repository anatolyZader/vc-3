const ChatPubsubAdapter = require('../../../../../../business_modules/chat/infrastructure/messaging/pubsub/chatPubsubAdapter');

describe('ChatPubsubAdapter', () => {
  test('publishEvent dispatches via function eventDispatcher', async () => {
    const events = [];
    const dispatcher = async (name, payload) => { events.push({ name, payload }); };
    const adapter = new ChatPubsubAdapter({ pubSubClient: {}, eventDispatcher: dispatcher });
    await adapter.addQuestion({ userId: 'u1', conversationId: 'c1', prompt: 'Why?' });
    expect(events[0].name).toBe('questionAdded');
    expect(events[0].payload.prompt).toBe('Why?');
  });
});
