const PromptContent = require('../../../../../business_modules/chat/domain/value_objects/promptContent');

describe('Chat domain PromptContent', () => {
  test('valid', () => {
    const p = new PromptContent('Hello');
    expect(p.toString()).toBe('Hello');
  });
  test('invalid', () => {
    expect(() => new PromptContent()).toThrow('Invalid prompt content.');
  });
  test('equality', () => {
    const p1 = new PromptContent('Same');
    const p2 = new PromptContent('Same');
    expect(p1.equals(p2)).toBe(true);
  });
});
