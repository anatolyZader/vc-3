'use strict';
const HttpApiSpec = require('../httpApiSpec');

describe('HttpApiSpec', () => {
  test('valid spec', () => {
    const spec = new HttpApiSpec({ paths: {} });
    expect(spec.value).toEqual({ paths: {} });
  });
  test('invalid spec throws', () => {
    expect(() => new HttpApiSpec()).toThrow('Invalid HttpApiSpec');
    expect(() => new HttpApiSpec('str')).toThrow('Invalid HttpApiSpec');
  });
  test('equality', () => {
    expect(new HttpApiSpec({a:1}).equals(new HttpApiSpec({a:1}))).toBe(true);
    expect(new HttpApiSpec({a:1}).equals(new HttpApiSpec({a:2}))).toBe(false);
  });
});
