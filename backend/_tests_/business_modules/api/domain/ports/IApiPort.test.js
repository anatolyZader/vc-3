'use strict';
const IApiPort = require('../../../../../business_modules/api/domain/ports/IApiPort.js');

describe('IApiPort abstract contract', () => {
  test('cannot instantiate', () => {
    expect(() => new IApiPort()).toThrow('Cannot instantiate an abstract class.');
  });
  test('methods throw', async () => {
    class Dummy extends IApiPort {}
    const d = new Dummy();
    await expect(d.fetchHttpApi('u','r')).rejects.toThrow('Method not implemented.');
  });
});
