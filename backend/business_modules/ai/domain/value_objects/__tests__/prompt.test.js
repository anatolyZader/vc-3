'use strict';
const Prompt = require('../prompt');

describe('Prompt', () => {
  test('valid prompt', () => {
    const p = new Prompt('hello');
    expect(p.text).toBe('hello');
  });
  test('invalid prompt throws', () => {
    ['','  '].forEach(v => expect(() => new Prompt(v.trim())).toThrow('Invalid Prompt'));
    expect(() => new Prompt()).toThrow('Invalid Prompt');
    expect(() => new Prompt(123)).toThrow('Invalid Prompt');
  });
  test('equality', () => {
    expect(new Prompt('a').equals(new Prompt('a'))).toBe(true);
    expect(new Prompt('a').equals(new Prompt('b'))).toBe(false);
  });
});
