const QuestionContent = require('../questionContent');

describe('QuestionContent Value Object', () => {
  test('creates valid question', () => {
    const q = new QuestionContent('  What?  ');
    expect(q.content).toBe('What?');
    expect(q.toString()).toBe('What?');
  });

  test('throws on invalid', () => {
    expect(() => new QuestionContent()).toThrow('Invalid question content.');
    expect(() => new QuestionContent({})).toThrow('Invalid question content.');
  });

  test('equality works', () => {
    const a = new QuestionContent('Why');
    const b = new QuestionContent('Why');
    const c = new QuestionContent('How');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
