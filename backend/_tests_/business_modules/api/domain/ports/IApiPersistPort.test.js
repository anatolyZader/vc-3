'use strict';
const IApiPersistPort = require('../../../../../business_modules/api/domain/ports/IApiPersistPort.js');

describe('IApiPersistPort abstract contract', () => {
  test('cannot instantiate', () => {
    expect(() => new IApiPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });
  test('methods throw', async () => {
    class Dummy extends IApiPersistPort {}
    const d = new Dummy();
    await expect(d.saveHttpApi('u','r',{})).rejects.toThrow("Method 'saveHttpApi()' must be implemented.");
    await expect(d.getHttpApi('u','r')).rejects.toThrow("Method 'getHttpApi()' must be implemented.");
  });
});
