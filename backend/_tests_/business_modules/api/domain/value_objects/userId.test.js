'use strict';
const UserId = require('../../../../../business_modules/api/domain/value_objects/userId');

describe('API::UserId', () => {
  test('valid id', () => {
    expect(new UserId('u1').value).toBe('u1');
  });
  test('invalid id throws', () => {
    expect(() => new UserId()).toThrow('Invalid UserId');
    expect(() => new UserId(123)).toThrow('Invalid UserId');
  });
  test('equality', () => {
    expect(new UserId('a').equals(new UserId('a'))).toBe(true);
    expect(new UserId('a').equals(new UserId('b'))).toBe(false);
  });
});
