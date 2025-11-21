const IAuthPersistPort = require('../IAuthPersistPort');

describe('IAuthPersistPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IAuthPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });

  const methods = ['readAllUsers','getUserInfo','registerUser','removeUser','findUserByUsername','loginUser','logoutUser'];
  for (const m of methods) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IAuthPersistPort {}
      const port = new TestPort();
      await expect(port[m]()).rejects.toThrow('Method');
    });
  }
});
