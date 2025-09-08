"use strict";

const path = require("path");

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
    const vso = new VectorSearchOrchestrator(makeVectorStore("user"), pineconeMock, {});
    const results = await vso.performSearch("abc");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map(r => r.metadata.source)).toEqual(expect.arrayContaining(["user-src", "core-src"]));
  });
});
