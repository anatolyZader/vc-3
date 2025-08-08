const AnswerAddedEvent = require('../answerAddedEvent');

describe('AnswerAddedEvent', () => {
  test('creates event', () => {
    const evt = new AnswerAddedEvent({ userId: 'u', conversationId: 'c', answer: 'Because' });
    expect(evt.answer).toBe('Because');
    expect(evt.userId).toBe('u');
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
