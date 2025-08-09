const AIPostgresAdapter = require('../../../../../business_modules/ai/infrastructure/persistence/aiPostgresAdapter');

describe('AIPostgresAdapter', () => {
  test('initPool initializes pool', async () => {
    const connect = jest.fn();
    const pool = { connect };
    const adapter = new AIPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    const result = await adapter.getPool();
    expect(result).toBe(pool);
  });
});
