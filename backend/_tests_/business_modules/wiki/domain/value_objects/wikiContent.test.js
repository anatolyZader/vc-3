const DocsContent = require('../../../../../business_modules/docs/domain/value_objects/docsContent.js');

describe('DocsContent Value Object', () => {
  test('stores content and toString', () => {
    const c = new DocsContent('Hello');
    expect(c.content).toBe('Hello');
    expect(c.toString()).toBe('Hello');
  });
});
