'use strict';
const IWikiPostgresPort = require('../../../../../business_modules/wiki/domain/ports/IWikiPersistPort');

describe('IWikiPostgresPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IWikiPostgresPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['persistWiki','readWiki','fetchPage','createPage','updatePage','deletePage']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IWikiPostgresPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
