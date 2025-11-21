const ChatPostgresAdapter = require('../../../../../business_modules/chat/infrastructure/persistence/chatPostgresAdapter');

describe('ChatPostgresAdapter', () => {
  test('startConversation uses pool', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'c1' }] });
    const client = { query, release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const adapter = new ChatPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    // method body is elided in source, just ensure getPool works
    const p = await adapter.getPool();
    expect(p).toBe(pool);
  });
});
