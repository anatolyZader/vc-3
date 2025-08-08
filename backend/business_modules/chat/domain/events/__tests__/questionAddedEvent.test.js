const QuestionAddedEvent = require('../questionAddedEvent');

describe('QuestionAddedEvent', () => {
  test('creates event', () => {
    const evt = new QuestionAddedEvent({ userId: 'u', conversationId: 'c', prompt: 'Why?' });
    expect(evt.prompt).toBe('Why?');
    expect(evt.userId).toBe('u');
    expect(evt.conversationId).toBe('c');
  });
});
