const IDocsPostgresPort = require('../../../../../business_modules/docs/domain/ports/IDocsPersistPort.js');

describe('IDocsPostgresPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IDocsPostgresPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['persistDocs','readDocs','fetchPage','createPage','updatePage','deletePage']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IDocsPostgresPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
