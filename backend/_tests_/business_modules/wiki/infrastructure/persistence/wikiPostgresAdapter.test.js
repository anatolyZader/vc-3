const DocsPostgresAdapter = require('../../../../../business_modules/docs/infrastructure/persistence/docsPostgresAdapter');

describe('DocsPostgresAdapter', () => {
  test('persistDocs executes upsert', async () => {
    const query = jest.fn().mockResolvedValue({});
    const client = { query, release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const adapter = new DocsPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    await adapter.persistDocs('u1','owner/repo',{ pages: [] });
    expect(query).toHaveBeenCalled();
  });
});
