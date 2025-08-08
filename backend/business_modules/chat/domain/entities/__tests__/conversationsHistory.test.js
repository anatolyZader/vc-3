const ConversationsHistory = require('../conversationsHistory');

class MockPersistPort {
  async fetchConversationsHistory(userId) { this.called = userId; return [{ id: 'c1' }, { id: 'c2' }]; }
}

describe('ConversationsHistory Entity', () => {
  test('fetchConversationsHistory returns list', async () => {
    const mock = new MockPersistPort();
    const history = new ConversationsHistory('user-1');
    const list = await history.fetchConversationsHistory(mock);
    expect(list.length).toBe(2);
    expect(mock.called).toBe('user-1');
  });
});
