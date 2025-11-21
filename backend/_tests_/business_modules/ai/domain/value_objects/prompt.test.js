const Prompt = require('../../../../../business_modules/ai/domain/value_objects/prompt');

describe('AI domain Prompt', () => {
  test('valid', () => {
    const p = new Prompt('Hello');
    expect(p.text).toBe('Hello');
  });
  test('invalid', () => {
    expect(() => new Prompt()).toThrow('Invalid Prompt');
  });
});
