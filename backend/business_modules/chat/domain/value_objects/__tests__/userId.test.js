const UserId = require('../userId');

describe('UserId Value Object', () => {
  test('creates valid UserId', () => {
    const id = new UserId('user-123');
    expect(id.value).toBe('user-123');
    expect(id.toString()).toBe('user-123');
  });

  test('throws on invalid input', () => {
    expect(() => new UserId()).toThrow('Invalid UserId');
    expect(() => new UserId(123)).toThrow('Invalid UserId');
  });

  test('equality works', () => {
    const a = new UserId('u');
    const b = new UserId('u');
    const c = new UserId('x');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
