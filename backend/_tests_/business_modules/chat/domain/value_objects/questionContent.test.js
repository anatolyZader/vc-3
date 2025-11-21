const QuestionContent = require('../../../../../business_modules/chat/domain/value_objects/questionContent');

describe('Chat domain QuestionContent', () => {
  test('valid', () => {
    const q = new QuestionContent('Question');
    expect(q.toString()).toBe('Question');
  });
  test('invalid', () => {
    expect(() => new QuestionContent()).toThrow('Invalid question content.');
  });
  test('equality', () => {
    const q1 = new QuestionContent('Same');
    const q2 = new QuestionContent('Same');
    expect(q1.equals(q2)).toBe(true);
  });
});
