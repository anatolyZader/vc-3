const Session = require('../session');

describe('Session Entity', () => {
  class MockInMemPort {
    async setSessionInMem(id, session){ this.set = { id, session }; }
    async getSession(id){ return this.set && this.set.id === id ? { createdAt: new Date() } : null; }
    async deleteSession(id){ this.deleted = id; }
  }

  test('setSessionInMem stores session', async () => {
    const port = new MockInMemPort();
    const s = new Session('user1', port);
    await s.setSessionInMem();
    expect(port.set.id).toBe(s.sessionId);
  });

  test('validateSession true when fresh', async () => {
    const port = new MockInMemPort();
    const s = new Session('user1', port);
    await s.setSessionInMem();
    const valid = await s.validateSession();
    expect(valid).toBe(true);
  });

  test('logout delegates delete', async () => {
    const port = new MockInMemPort();
    const s = new Session('user1', port);
    await s.logout();
    expect(port.deleted).toBe(s.sessionId);
  });
});
