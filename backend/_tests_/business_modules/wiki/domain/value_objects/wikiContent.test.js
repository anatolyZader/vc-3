const WikiContent = require('../../../../business_modules/wiki/domain/value_objects/wikiContent.js');

describe('WikiContent Value Object', () => {
  test('stores content and toString', () => {
    const c = new WikiContent('Hello');
    expect(c.content).toBe('Hello');
    expect(c.toString()).toBe('Hello');
  });
});
