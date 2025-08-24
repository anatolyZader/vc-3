const WikiPageTitle = require('../../../../../business_modules/wiki/domain/value_objects/wikiPageTitle.js');

describe('WikiPageTitle Value Object', () => {
  test('trims title, equals works', () => {
    const a = new WikiPageTitle('  Title  ');
    expect(a.title).toBe('Title');
    const b = new WikiPageTitle('Title');
    const c = new WikiPageTitle('Other');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.toString()).toBe('Title');
  });
});
