const PromptContent = require('../promptContent');

describe('PromptContent Value Object', () => {
  test('creates valid prompt', () => {
    const p = new PromptContent('  Hello?  ');
    expect(p.content).toBe('Hello?');
    expect(p.toString()).toBe('Hello?');
  });

  test('throws on invalid', () => {
    expect(() => new PromptContent()).toThrow('Invalid prompt content.');
    expect(() => new PromptContent(42)).toThrow('Invalid prompt content.');
  });

  test('equality works', () => {
    const a = new PromptContent('Hi');
    const b = new PromptContent('Hi');
    const c = new PromptContent('Bye');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
