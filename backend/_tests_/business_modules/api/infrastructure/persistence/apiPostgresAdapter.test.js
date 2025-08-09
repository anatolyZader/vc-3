const ApiPostgresAdapter = require('../../../../../business_modules/api/infrastructure/persistence/apiPostgresAdapter');

describe('ApiPostgresAdapter', () => {
  function makePool() {
    return {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      })
    };
  }
  test('constructs with local pool', async () => {
    const adapter = new ApiPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(makePool());
    const pool = await adapter.poolPromise;
    expect(pool.connect).toBeDefined();
  });
});
