const RepoId = require('../../../../../business_modules/ai/domain/value_objects/repoId');

describe('AI domain RepoId', () => {
  test('valid', () => {
    const id = new RepoId('r1');
    expect(id.value).toBe('r1');
  });
  test('invalid', () => {
    expect(() => new RepoId()).toThrow('Invalid RepoId');
  });
});
