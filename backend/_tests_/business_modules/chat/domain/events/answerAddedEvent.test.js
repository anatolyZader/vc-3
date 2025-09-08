const AnswerAddedEvent = require('../../../../../business_modules/chat/domain/events/answerAddedEvent');

describe('Chat domain AnswerAddedEvent', () => {
  test('construct', () => {
    const e = new AnswerAddedEvent({ userId: 'u', conversationId: 'c', answer: 'A' });
    expect(e.userId).toBe('u');
    expect(e.answer).toBe('A');
    expect(e.conversationId).toBe('c');
    expect(e.occurredAt).toBeInstanceOf(Date);
  });
});
