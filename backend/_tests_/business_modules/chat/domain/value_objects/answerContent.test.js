const AnswerContent = require('../../../../../business_modules/chat/domain/value_objects/answerContent');

describe('Chat domain AnswerContent', () => {
  test('valid', () => {
    const a = new AnswerContent('Answer');
    expect(a.toString()).toBe('Answer');
  });
  test('invalid', () => {
    expect(() => new AnswerContent()).toThrow('Invalid answer content.');
  });
  test('equality', () => {
    const a1 = new AnswerContent('Same');
    const a2 = new AnswerContent('Same');
    expect(a1.equals(a2)).toBe(true);
  });
});
