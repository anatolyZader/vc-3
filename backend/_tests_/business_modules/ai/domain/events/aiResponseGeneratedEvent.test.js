const AiResponseGeneratedEvent = require('../../../../../business_modules/ai/domain/events/aiResponseGeneratedEvent');

describe('AiResponseGeneratedEvent', () => {
  test('creates event', () => {
    const evt = new AiResponseGeneratedEvent({ userId: 'u', conversationId: 'c', prompt: 'p', response: 'r'});
    expect(evt.userId).toBe('u');
    expect(evt.prompt).toBe('p');
  });
});
