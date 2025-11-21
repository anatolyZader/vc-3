const AIPostgresAdapter = require('../../../../../business_modules/ai/infrastructure/persistence/aiPostgresAdapter');

describe('AIPostgresAdapter', () => {
  function buildAdapterWithPool(mocks = {}) {
    const connect = jest.fn().mockResolvedValue({
      query: jest.fn(mocks.query || (async () => ({ rows: [{ id: 1 }] }))),
      release: jest.fn()
    });
    const pool = { connect };
    const adapter = new AIPostgresAdapter({ cloudSqlConnector: {} });
    adapter.poolPromise = Promise.resolve(pool);
    return { adapter, pool, connect };
  }

  test('getPool returns injected pool', async () => {
    const { adapter, pool } = buildAdapterWithPool();
    const result = await adapter.getPool();
    expect(result).toBe(pool);
  });

  test('saveGitData inserts and returns id, handles pool errors by returning null', async () => {
    const { adapter } = buildAdapterWithPool({
      query: async () => ({ rows: [{ id: 42 }] })
    });
    const id = await adapter.saveGitData('u', 'r', 'content');
    expect(id).toBe(42);

    // Simulate pool acquisition failure path
    jest.spyOn(adapter, 'getPool').mockRejectedValueOnce(new Error('pool down'));
    const fallback = await adapter.saveGitData('u', 'r', 'content');
    expect(fallback).toBeNull();
  });

  test('saveDocsData inserts and returns id, handles pool errors by returning null', async () => {
    const { adapter } = buildAdapterWithPool({
      query: async () => ({ rows: [{ id: 7 }] })
    });
    const id = await adapter.saveDocsData('u', 'r', 'docs');
    expect(id).toBe(7);

    jest.spyOn(adapter, 'getPool').mockRejectedValueOnce(new Error('pool down'));
    const fallback = await adapter.saveDocsData('u', 'r', 'docs');
    expect(fallback).toBeNull();
  });

  test('saveAiResponse inserts and returns id, handles pool errors by returning null', async () => {
    const { adapter } = buildAdapterWithPool({
      query: async () => ({ rows: [{ id: 99 }] })
    });
    const id = await adapter.saveAiResponse({ userId: 'u', conversationId: 'c', repoId: 'r', prompt: 'p', response: 'a' });
    expect(id).toBe(99);

    jest.spyOn(adapter, 'getPool').mockRejectedValueOnce(new Error('pool down'));
    const fallback = await adapter.saveAiResponse({ userId: 'u', conversationId: 'c', repoId: 'r', prompt: 'p', response: 'a' });
    expect(fallback).toBeNull();
  });

  test('getAiResponses returns rows, returns [] on pool error', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const { adapter } = buildAdapterWithPool({ query: async () => ({ rows }) });
    const result = await adapter.getAiResponses('c');
    expect(result).toEqual(rows);

    jest.spyOn(adapter, 'getPool').mockRejectedValueOnce(new Error('pool down'));
    const fallback = await adapter.getAiResponses('c');
    expect(fallback).toEqual([]);
  });

  test('getConversationHistory maps rows, returns [] on pool error', async () => {
    const now = new Date();
    const rows = [
      { prompt: 'p1', response: 'a1', created_at: now },
      { prompt: 'p2', response: 'a2', created_at: now }
    ];
    const { adapter } = buildAdapterWithPool({ query: async () => ({ rows }) });
    const result = await adapter.getConversationHistory('c', 2);
    expect(result).toEqual([
      { prompt: 'p1', response: 'a1', timestamp: now },
      { prompt: 'p2', response: 'a2', timestamp: now },
    ]);

    jest.spyOn(adapter, 'getPool').mockRejectedValueOnce(new Error('pool down'));
    const fallback = await adapter.getConversationHistory('c', 2);
    expect(fallback).toEqual([]);
  });
});
