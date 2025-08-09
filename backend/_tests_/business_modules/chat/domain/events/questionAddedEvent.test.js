const QuestionAddedEvent = require('../../../../../business_modules/chat/domain/events/questionAddedEvent');

describe('Chat domain QuestionAddedEvent', () => {
  test('construct', () => {
    const e = new QuestionAddedEvent({ userId: 'u', conversationId: 'c', prompt: 'P' });
    expect(e.userId).toBe('u');
    expect(e.conversationId).toBe('c');
    expect(e.prompt).toBe('P');
    expect(e.occurredAt).toBeInstanceOf(Date);
  });
});
