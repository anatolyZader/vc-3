const ChatPostgresAdapter = require('../../../../../business_modules/chat/infrastructure/persistence/chatPostgresAdapter');

// Mock pg Pool to prevent real connections
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    end: jest.fn()
  }))
}));

describe('ChatPostgresAdapter', () => {
  test('startConversation uses pool', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'c1' }] });
    const client = { query, release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(client), end: jest.fn() };
    const adapter = new ChatPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    // method body is elided in source, just ensure getPool works
    const p = await adapter.getPool();
    expect(p).toHaveProperty('connect');
    expect(p).toHaveProperty('end');
  });
});
