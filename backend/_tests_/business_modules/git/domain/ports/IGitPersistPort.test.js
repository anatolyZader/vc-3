const IGitPersistPort = require('../../../../../business_modules/git/domain/ports/IGitPersistPort.js');

describe('IGitPersistPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IGitPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['persistRepo','persistDocs']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IGitPersistPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
