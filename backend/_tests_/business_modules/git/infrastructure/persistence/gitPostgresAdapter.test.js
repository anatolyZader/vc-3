const GitPostgresAdapter = require('../../../../../business_modules/git/infrastructure/persistence/gitPostgresAdapter');

describe('GitPostgresAdapter', () => {
  test('persistRepo executes insert/update query', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 1 });
    const client = { query, release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const adapter = new GitPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    await adapter.persistRepo('u1','owner/repo',{ id: 'owner/repo' });
    expect(query).toHaveBeenCalled();
  });
});
