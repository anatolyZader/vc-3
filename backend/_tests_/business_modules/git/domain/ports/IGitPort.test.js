const IGitPort = require('../IGitPort');

describe('IGitPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IGitPort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['fetchRepo','fetchWiki']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IGitPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
