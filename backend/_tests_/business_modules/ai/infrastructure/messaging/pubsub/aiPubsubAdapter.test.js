const AIPubsubAdapter = require('../../../../../../business_modules/ai/infrastructure/messaging/pubsub/aiPubsubAdapter');

describe('AIPubsubAdapter', () => {
  test('publishAiResponse publishes event with payload spread', async () => {
    const publishMessage = jest.fn().mockResolvedValue('ai-msg');
    const topic = { publishMessage };
    const pubSubClient = { topic: jest.fn().mockReturnValue(topic) };
    const adapter = new AIPubsubAdapter({ pubSubClient });
    const id = await adapter.publishAiResponse('aiResponseGenerated', { userId: 'u1', response: 'ok' });
    expect(id).toBe('ai-msg');
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('aiResponseGenerated');
    expect(payload.userId).toBe('u1'); // spread directly
    expect(payload.response).toBe('ok');
  });
});
