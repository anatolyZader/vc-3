const RepoId = require('../../../../business_modules/git/domain/value_objects/repoId.js');

describe('RepoId Value Object', () => {
  test('valid', () => {
    const id = new RepoId('r1');
    expect(id.value).toBe('r1');
  });
  test('invalid', () => {
    expect(() => new RepoId()).toThrow('Invalid RepoId');
    expect(() => new RepoId(7)).toThrow('Invalid RepoId');
  });
  test('equality', () => {
    const a = new RepoId('a');
    const b = new RepoId('a');
    const c = new RepoId('b');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
