"use strict";

const path = require("path");

// Mock PineconePlugin to avoid PINECONE_API_KEY requirement
jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin",
  () => jest.fn().mockImplementation(() => ({
    getClient: jest.fn(async () => ({})),
    validateConfig: jest.fn(),
    connect: jest.fn(async () => ({}))
  }))
);

// Mock PineconeService to avoid PINECONE_API_KEY requirement
jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService",
  () => jest.fn().mockImplementation(() => ({
    validateConfig: jest.fn(),
    getClient: jest.fn(async () => ({})),
    createVectorStore: jest.fn(async () => ({})),
    querySimilar: jest.fn(async () => ({
      matches: [
        { id: 'test1', score: 0.9, metadata: { source: 'core-src', text: 'core:abc' } },
        { id: 'test2', score: 0.8, metadata: { source: 'user-src', text: 'user:abc' } }
      ]
    })),
    client: {
      listIndexes: jest.fn(async () => ({ indexes: [{ name: 'eventstorm-index' }] })),
      createIndex: jest.fn(async () => ({})),
      index: jest.fn(() => ({}))
    }
  }))
);

// Create a dummy vector store with similaritySearch
function makeVectorStore(name) {
  return {
    similaritySearch: jest.fn(async (prompt, k, opts) => {
      const filterSuffix = opts?.filter ? "-filtered" : "";
      return [
        { pageContent: `${name}:${prompt}${filterSuffix}`, metadata: { source: `${name}-src` } }
      ];
    })
  };
}

const { PineconeStore } = require("@langchain/pinecone");
jest.mock("@langchain/pinecone", () => ({
  PineconeStore: jest.fn().mockImplementation((embeddings, { pineconeIndex, namespace }) => ({
    namespace,
    similaritySearch: jest.fn(async (prompt, k, opts) => [{ pageContent: `core:${prompt}`, metadata: { source: "core-src" } }])
  }))
}));

const pineconeMock = { Index: jest.fn(() => ({})) };
const VectorSearchOrchestrator = require("../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator");

describe("VectorSearchOrchestrator integration", () => {
  test("performs user + core searches and merges results", async () => {
    const mockEmbeddings = {
      embedQuery: jest.fn(async () => [0.1, 0.2, 0.3]) // Mock embedding vector
    };
    
    const vso = new VectorSearchOrchestrator(makeVectorStore("user"), pineconeMock, mockEmbeddings);
    const results = await vso.performSearch("abc");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map(r => r.metadata.source)).toEqual(expect.arrayContaining(["user-src", "core-src"]));
  });
});
