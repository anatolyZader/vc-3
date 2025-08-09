const WikiRepoId = require('../wikiRepoId');

describe('WikiRepoId Value Object', () => {
  test('stores id and toString', () => {
    const id = new WikiRepoId('r1');
    expect(id.id).toBe('r1');
    expect(id.toString()).toBe('r1');
  });
});
