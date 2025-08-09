const IGitPersistPort = require('../IGitPersistPort');

describe('IGitPersistPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IGitPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['persistRepo','persistWiki']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IGitPersistPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
