const WikiContent = require('../wikiContent');

describe('WikiContent Value Object', () => {
  test('stores content and toString', () => {
    const c = new WikiContent('Hello');
    expect(c.content).toBe('Hello');
    expect(c.toString()).toBe('Hello');
  });
});
