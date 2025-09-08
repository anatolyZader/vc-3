const UserId = require('../../../../../business_modules/chat/domain/value_objects/userId');

describe('Chat domain UserId', () => {
  test('valid', () => {
    const id = new UserId('u1');
    expect(id.toString()).toBe('u1');
  });
  test('invalid', () => {
    expect(() => new UserId()).toThrow('Invalid UserId');
  });
  test('equality', () => {
    const id1 = new UserId('same');
    const id2 = new UserId('same');
    expect(id1.equals(id2)).toBe(true);
  });
});
