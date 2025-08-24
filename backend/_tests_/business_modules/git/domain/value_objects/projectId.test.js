const ProjectId = require('../../../../business_modules/git/domain/value_objects/projectId.js');

describe('ProjectId Value Object', () => {
  test('valid', () => {
    const id = new ProjectId('p1');
    expect(id.value).toBe('p1');
  });
  test('invalid', () => {
    expect(() => new ProjectId()).toThrow('Invalid ProjectId');
    expect(() => new ProjectId({})).toThrow('Invalid ProjectId');
  });
  test('equality', () => {
    const a = new ProjectId('x');
    const b = new ProjectId('x');
    const c = new ProjectId('y');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
