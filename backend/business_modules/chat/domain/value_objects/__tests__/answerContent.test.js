const AnswerContent = require('../answerContent');

describe('AnswerContent Value Object', () => {
  test('creates valid answer', () => {
    const a = new AnswerContent('  Because.  ');
    expect(a.content).toBe('Because.');
    expect(a.toString()).toBe('Because.');
  });

  test('throws on invalid', () => {
    expect(() => new AnswerContent()).toThrow('Invalid answer content.');
    expect(() => new AnswerContent([])).toThrow('Invalid answer content.');
  });

  test('equality works', () => {
    const a = new AnswerContent('Ok');
    const b = new AnswerContent('Ok');
    const c = new AnswerContent('Not ok');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
