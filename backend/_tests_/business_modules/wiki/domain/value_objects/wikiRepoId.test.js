const DocsRepoId = require('../../../../../business_modules/docs/domain/value_objects/docsRepoId.js');

describe('DocsRepoId Value Object', () => {
  test('stores id and toString', () => {
    const id = new DocsRepoId('r1');
    expect(id.id).toBe('r1');
    expect(id.toString()).toBe('r1');
  });
});
