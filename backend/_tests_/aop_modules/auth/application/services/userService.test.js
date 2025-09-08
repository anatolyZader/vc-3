const UserService = require('../../../../../aop_modules/auth/application/services/userService');

class MockPersist {
  async readAllUsers(){ return [{ email: 'a@b.com'}]; }
  async registerUser(u,e,p){ return { id: '1', username: u, email: e, password: p }; }
  async getUserInfo(email){ if(email==='x@b.com') return null; return { id: '1', email, username: 'name', password: await require('bcrypt').hash('pw', 1) }; }
  async removeUser(email){ this.removed = email; }
}

describe('UserService', () => {
  test('readAllUsers returns list', async () => {
    const svc = new UserService({ authPersistAdapter: new MockPersist() });
    const list = await svc.readAllUsers();
    expect(list.length).toBe(1);
  });
  test('registerUser returns new user', async () => {
    const svc = new UserService({ authPersistAdapter: new MockPersist() });
    const u = await svc.registerUser('user','u@b.com','pw');
    expect(u.email).toBe('u@b.com');
  });
  test('getUserInfo returns user', async () => {
    const svc = new UserService({ authPersistAdapter: new MockPersist() });
    const u = await svc.getUserInfo('a@b.com');
    expect(u.email).toBe('a@b.com');
  });
  test('removeUser delegates', async () => {
    const persist = new MockPersist();
    const svc = new UserService({ authPersistAdapter: persist });
    await svc.removeUser('a@b.com');
    expect(persist.removed).toBe('a@b.com');
  });
});
