const UserId = require('../../../../../business_modules/git/domain/value_objects/userId.js');

describe('Git UserId Value Object', () => {
  test('valid creation', () => {
    const id = new UserId('user-1');
    expect(id.value).toBe('user-1');
    expect(id.toString()).toBe('user-1');
  });

  test('invalid creation', () => {
    expect(() => new UserId()).toThrow('Invalid UserId');
    expect(() => new UserId(5)).toThrow('Invalid UserId');
  });

  test('equality', () => {
    const a = new UserId('u');
    const b = new UserId('u');
    const c = new UserId('x');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
