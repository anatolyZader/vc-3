const Account = require('../account');

describe('Account Entity', () => {
  class MockPersistPort {
    async saveAccount(acc){ this.saved = acc; }
    async fetchAccountDetails(id){ this.fetched = id; return { accountId: id, accountType: 'standard', videos: [] }; }
    async addVideoToAccount(accountId, vid){ this.added = { accountId, vid }; }
    async removeVideo(accountId, vid){ this.removed = { accountId, vid }; }
  }

  test('createAccount persists', async () => {
    const port = new MockPersistPort();
    const acc = new Account('user1', port);
    await acc.createAccount();
    expect(port.saved).toBe(acc);
  });

  test('fetchAccountDetails updates instance', async () => {
    const port = new MockPersistPort();
    const acc = new Account('user1', port);
    const id = acc.accountId;
    const data = await acc.fetchAccountDetails(id);
    expect(data.accountId).toBe(id);
    expect(acc.accountType).toBe('standard');
  });

  test('addVideo delegates', async () => {
    const port = new MockPersistPort();
    const acc = new Account('user1', port);
    await acc.addVideo('v1');
    expect(port.added).toEqual({ accountId: acc.accountId, vid: 'v1' });
  });

  test('removeVideo delegates', async () => {
    const port = new MockPersistPort();
    const acc = new Account('user1', port);
    await acc.removeVideo('v1');
    expect(port.removed).toEqual({ accountId: acc.accountId, vid: 'v1' });
  });
});
