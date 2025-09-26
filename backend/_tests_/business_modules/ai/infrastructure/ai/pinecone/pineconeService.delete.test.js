"use strict";

const path = require("path");

const servicePath = path.resolve(
  __dirname,
  "../../../../../../business_modules/ai/infrastructure/ai/pinecone/PineconeService.js"
);

describe("PineconeService delete operations", () => {
  let PineconeService;
  let indexDeleteMock;
  let listIndexesMock;

  beforeEach(() => {
    jest.resetModules();

    indexDeleteMock = jest.fn(async () => ({}));
    listIndexesMock = jest.fn(async () => ({ indexes: [{ name: "eventstorm-index" }] }));

    jest.doMock("@pinecone-database/pinecone", () => ({
      Pinecone: jest.fn().mockImplementation(() => ({
        listIndexes: listIndexesMock,
        createIndex: jest.fn(),
        index: jest.fn(() => ({ delete: indexDeleteMock }))
      }))
    }), { virtual: true });

    // We don't need PineconeStore for delete tests, but mock to avoid real import cost
    jest.doMock("@langchain/pinecone", () => ({ PineconeStore: jest.fn() }), { virtual: true });

    process.env.PINECONE_API_KEY = "key";
    process.env.PINECONE_INDEX_NAME = "eventstorm-index";

    PineconeService = require(servicePath);
  });

  test("deleteVectors calls index.delete with ids only when no namespace", async () => {
    const svc = new PineconeService();
    await svc.deleteVectors(["a","b"]);
    expect(indexDeleteMock).toHaveBeenCalledWith({ ids: ["a","b"] });
  });

  test("deleteVectors calls index.delete with ids and namespace when provided", async () => {
    const svc = new PineconeService();
    await svc.deleteVectors(["x"], "ns1");
    expect(indexDeleteMock).toHaveBeenCalledWith({ ids: ["x"], namespace: "ns1" });
  });

  test("deleteNamespace uses deleteAll true", async () => {
    const svc = new PineconeService();
    await svc.deleteNamespace("ns2");
    expect(indexDeleteMock).toHaveBeenCalledWith({ deleteAll: true, namespace: "ns2" });
  });
});
