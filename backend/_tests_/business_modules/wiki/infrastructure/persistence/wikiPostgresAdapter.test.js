const WikiPostgresAdapter = require('../../../../../business_modules/wiki/infrastructure/persistence/wikiPostgresAdapter');

describe('WikiPostgresAdapter', () => {
  test('persistWiki executes upsert', async () => {
    const query = jest.fn().mockResolvedValue({});
    const client = { query, release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const adapter = new WikiPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    await adapter.persistWiki('u1','owner/repo',{ pages: [] });
    expect(query).toHaveBeenCalled();
  });
});
