'use strict';
const RepoId = require('../repoId');

describe('RepoId', () => {
  test('valid repo id', () => {
    const id = new RepoId('r1');
    expect(id.value).toBe('r1');
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
