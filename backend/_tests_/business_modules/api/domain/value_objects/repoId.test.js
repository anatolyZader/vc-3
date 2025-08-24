'use strict';
const RepoId = require('../../../../business_modules/api/domain/value_objects/repoId.js');

describe('API::RepoId', () => {
  test('valid repo id', () => {
    expect(new RepoId('r1').value).toBe('r1');
  });
  test('invalid repo id throws', () => {
    expect(() => new RepoId()).toThrow('Invalid RepoId');
    expect(() => new RepoId(42)).toThrow('Invalid RepoId');
  });
  test('equality', () => {
    expect(new RepoId('x').equals(new RepoId('x'))).toBe(true);
    expect(new RepoId('x').equals(new RepoId('y'))).toBe(false);
  });
});
