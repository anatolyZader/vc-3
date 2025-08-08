'use strict';
const IAIPersistPort = require('../IAIPersistPort');

describe('IAIPersistPort abstract contract', () => {
  test('cannot instantiate directly', () => {
    expect(() => new IAIPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });
});
