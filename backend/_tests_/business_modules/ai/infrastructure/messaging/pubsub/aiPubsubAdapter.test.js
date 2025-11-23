const AIPubsubAdapter = require('../../../../../../business_modules/ai/infrastructure/messaging/pubsub/aiPubsubAdapter');

describe('AIPubsubAdapter', () => {
  test('publishAiResponse publishes event with payload spread', async () => {
    const transport = { publish: jest.fn().mockResolvedValue('ai-msg') };
    const logger = { info: jest.fn(), error: jest.fn() };
    const adapter = new AIPubsubAdapter({ transport, logger });
    
    const id = await adapter.publishAiResponse('aiResponseGenerated', { userId: 'u1', response: 'ok' });
    
    expect(id).toBe('ai-msg');
    expect(transport.publish).toHaveBeenCalledWith('ai-events', expect.objectContaining({
      event: 'aiResponseGenerated',
      payload: expect.objectContaining({ userId: 'u1', response: 'ok' })
    }));
  });
});
