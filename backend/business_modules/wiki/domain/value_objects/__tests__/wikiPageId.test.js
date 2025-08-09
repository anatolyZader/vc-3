const WikiPageId = require('../wikiPageId');

describe('WikiPageId Value Object', () => {
  test('stores id and toString', () => {
    const id = new WikiPageId('p1');
    expect(id.id).toBe('p1');
    expect(id.toString()).toBe('p1');
  });
});
