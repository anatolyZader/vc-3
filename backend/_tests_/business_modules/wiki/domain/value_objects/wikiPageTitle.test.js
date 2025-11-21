const DocsPageTitle = require('../../../../../business_modules/docs/domain/value_objects/docsPageTitle.js');

describe('DocsPageTitle Value Object', () => {
  test('trims title, equals works', () => {
    const a = new DocsPageTitle('  Title  ');
    expect(a.title).toBe('Title');
    const b = new DocsPageTitle('Title');
    const c = new DocsPageTitle('Other');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.toString()).toBe('Title');
  });
});
