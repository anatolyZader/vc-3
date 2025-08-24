'use strict';
const HttpApi = require('../httpApi');

// Using simple primitives; domain layer here does not enforce VO types internally

describe('HttpApi entity', () => {
  test('fetches and persists spec', async () => {
    const entity = new HttpApi('user1','repo1');
    const specObj = { paths: { '/x': { get: {} } } };
    const port = { fetchHttpApi: jest.fn().mockResolvedValue(specObj) };
    const persist = { saveHttpApi: jest.fn().mockResolvedValue() };
    const result = await entity.fetchHttpApi(port, persist);
    expect(result).toEqual(specObj);
    expect(port.fetchHttpApi).toHaveBeenCalledWith('user1','repo1');
    expect(persist.saveHttpApi).toHaveBeenCalledWith('user1','repo1', specObj);
  });
});
