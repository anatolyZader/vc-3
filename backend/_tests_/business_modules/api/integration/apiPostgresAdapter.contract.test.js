"use strict";

const path = require("path");

describe("ApiPostgresAdapter (contract)", () => {
  const adapterPath = path.resolve(
    __dirname,
    "../../../../business_modules/api/infrastructure/persistence/apiPostgresAdapter.js"
  );

  function buildWithPool(mockPool) {
    jest.isolateModules(() => {});
    const Adapter = require(adapterPath);
    const adapter = new Adapter({ cloudSqlConnector: {} });
    adapter.pool = mockPool; // inject directly to bypass env/connector
    adapter.poolPromise = Promise.resolve(mockPool);
    return adapter;
  }

  test("saveHttpApi performs upsert query", async () => {
    const queries = [];
    const mockClient = { query: jest.fn(async (q, v) => { queries.push({ q, v }); }), release: jest.fn() };
    const mockPool = { connect: jest.fn(async () => mockClient) };
    const adapter = buildWithPool(mockPool);

    await adapter.saveHttpApi("u1", "r1", { openapi: "3.0.0" });

    expect(mockPool.connect).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("getHttpApi returns null when no rows", async () => {
    const mockClient = { query: jest.fn(async () => ({ rows: [] })), release: jest.fn() };
    const mockPool = { connect: jest.fn(async () => mockClient) };
    const adapter = buildWithPool(mockPool);

    const out = await adapter.getHttpApi("u1", "r1");
    expect(out).toBeNull();
  });
});
