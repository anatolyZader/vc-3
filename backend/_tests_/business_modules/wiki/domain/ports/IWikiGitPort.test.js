const IDocsGitPort = require('../../../../../business_modules/docs/domain/ports/IDocsGitPort.js');

describe('IDocsGitPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IDocsGitPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['fetchDocs','fetchPage','createPage','updatePage','deletePage']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IDocsGitPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
