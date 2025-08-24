const IWikiGitPort = require('../../../../../business_modules/wiki/domain/ports/IWikiGitPort.js');

describe('IWikiGitPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IWikiGitPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['fetchWiki','fetchPage','createPage','updatePage','deletePage']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IWikiGitPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
