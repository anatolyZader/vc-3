"use strict";

const path = require("path");

// Mock functions that will be referenced in tests
let mockIndexDelete;
let mockListIndexes;

jest.mock("@pinecone-database/pinecone", () => {
  mockIndexDelete = jest.fn(async () => ({}));
  mockListIndexes = jest.fn(async () => ({ indexes: [{ name: "eventstorm-index" }] }));
  
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      listIndexes: mockListIndexes,
      createIndex: jest.fn(),
      index: jest.fn(() => ({ 
        delete: mockIndexDelete,
        upsert: jest.fn(),
        query: jest.fn()
      }))
    }))
  };
});

jest.mock("@langchain/pinecone", () => ({ 
  PineconeStore: jest.fn() 
}));

const servicePath = path.resolve(
  __dirname,
  "../../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService.js"
);

describe("PineconeService delete operations", () => {
  let PineconeService;

  beforeAll(() => {
    process.env.PINECONE_API_KEY = "test-key";
    process.env.PINECONE_INDEX_NAME = "eventstorm-index";
    
    PineconeService = require(servicePath);
  });

  beforeEach(() => {
    mockIndexDelete.mockClear();
    mockListIndexes.mockClear();
  });

  test("deleteVectors calls index.delete with ids only when no namespace", async () => {
    const svc = new PineconeService();
    await svc.deleteVectors(["a","b"]);
    expect(mockIndexDelete).toHaveBeenCalledWith({ ids: ["a","b"] });
  });

  test("deleteVectors calls index.delete with ids and namespace when provided", async () => {
    const svc = new PineconeService();
    await svc.deleteVectors(["x"], "ns1");
    expect(mockIndexDelete).toHaveBeenCalledWith({ ids: ["x"], namespace: "ns1" });
  });

  test("deleteNamespace uses deleteAll true", async () => {
    const svc = new PineconeService();
    await svc.deleteNamespace("ns2");
    expect(mockIndexDelete).toHaveBeenCalledWith({ deleteAll: true, namespace: "ns2" });
  });
});
