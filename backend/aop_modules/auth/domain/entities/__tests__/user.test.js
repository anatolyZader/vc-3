const User = require('../user');

describe('User Entity', () => {
  class MockPersistPort {
    async getUserInfo(email){ this.got = email; return { email }; }
    async registerUser(username, email, password){ this.registered = { username, email }; return { username, email }; }
    async removeUser(email){ this.removed = email; }
  }

  test('getUserInfo delegates', async () => {
    const port = new MockPersistPort();
    const u = new User();
    const data = await u.getUserInfo('a@b.com', port);
    expect(data.email).toBe('a@b.com');
    expect(port.got).toBe('a@b.com');
  });

  test('registerUser delegates', async () => {
    const port = new MockPersistPort();
    const u = new User();
    const data = await u.registerUser('name','a@b.com','pw', port);
    expect(data.email).toBe('a@b.com');
    expect(port.registered.email).toBe('a@b.com');
  });

  test('removeUser delegates', async () => {
    const port = new MockPersistPort();
    const u = new User();
    await u.removeUser('a@b.com', port);
    expect(port.removed).toBe('a@b.com');
  });

  test('addRole and removeRole modify roles', () => {
    const u = new User();
    u.addRole('admin');
    expect(u.roles).toContain('admin');
    u.removeRole('admin');
    expect(u.roles).not.toContain('admin');
  });
});
