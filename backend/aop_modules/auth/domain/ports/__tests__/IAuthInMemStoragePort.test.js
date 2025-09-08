const IAuthInMemStoragePort = require('../IAuthInMemStoragePort');

describe('IAuthInMemStoragePort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IAuthInMemStoragePort()).toThrow('Cannot instantiate an abstract class.');
  });

  for (const m of ['setSessionInMem','getSession','deleteSession']) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IAuthInMemStoragePort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method');
    });
  }
});
