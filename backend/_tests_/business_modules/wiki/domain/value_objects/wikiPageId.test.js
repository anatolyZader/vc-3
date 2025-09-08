const DocsPageId = require('../../../../../business_modules/docs/domain/value_objects/docsPageId.js');

describe('DocsPageId Value Object', () => {
  test('stores id and toString', () => {
    const id = new DocsPageId('p1');
    expect(id.id).toBe('p1');
    expect(id.toString()).toBe('p1');
  });
});
