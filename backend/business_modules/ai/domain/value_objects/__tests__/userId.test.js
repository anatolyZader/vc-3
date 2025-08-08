'use strict';
const UserId = require('../userId');

describe('UserId', () => {
  test('valid id', () => {
    const id = new UserId('u1');
    expect(id.value).toBe('u1');
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
