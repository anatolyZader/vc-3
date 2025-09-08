const UserId = require('../../../../../business_modules/ai/domain/value_objects/userId');

describe('AI domain UserId', () => {
  test('valid', () => {
    const id = new UserId('u1');
    expect(id.value).toBe('u1');
  });
  test('invalid', () => {
    expect(() => new UserId()).toThrow('Invalid UserId');
  });
});
