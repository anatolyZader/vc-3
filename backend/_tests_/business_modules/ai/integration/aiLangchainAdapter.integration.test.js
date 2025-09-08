"use strict";

// Integration tests for AILangchainAdapter with lightweight module mocks

const path = require("path");

// Mock external SDKs to avoid network/real initialization
jest.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({ /* no-op */ }))
}));

jest.mock("@pinecone-database/pinecone", () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    Index: jest.fn(() => ({ /* index stub */ }))
  }))
}));

jest.mock("@langchain/pinecone", () => ({
  PineconeStore: jest.fn().mockImplementation((embeddings, { pineconeIndex, namespace }) => ({
    pineconeIndex,
    namespace,
    __store__: true
  }))
}));

// Mock provider manager to return a fake LLM
jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/providers/lLMProviderManager",
  () => {
    return jest.fn().mockImplementation(() => ({
      getLLM: jest.fn(() => ({
        invoke: jest.fn(async (messages) => ({ content: "mock-llm-response" }))
      }))
    }));
  }
);

// Mock QueryPipeline to observe construction and respond behavior
const mockQueryPipeline = jest.fn().mockImplementation((opts) => ({
  __opts: opts,
  respondToPrompt: jest.fn(async (userId, conversationId, prompt, history, vectorStore) => ({
    success: true,
    response: `ok:${prompt}`,
    conversationId,
    meta: {
      userId,
      vectorStoreNS: vectorStore?.namespace || null
    }
  }))
}));

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline",
  () => mockQueryPipeline
);

// Mock DataPreparationPipeline to simulate repo processing
const mockDataPreparationPipeline = jest.fn().mockImplementation((opts) => ({
  __opts: opts,
  processPushedRepo: jest.fn(async (userId, repoId, repoData) => ({
    success: true,
    userId,
    repoId,
    processedAt: "test",
    repoUrl: repoData?.url || null
  }))
}));

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/dataPreparationPipeline",
  () => mockDataPreparationPipeline
);

// SUT
const AILangchainAdapter = require("../../../../business_modules/ai/infrastructure/ai/aiLangchainAdapter");

describe("AI business module integration: AILangchainAdapter", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...OLD_ENV, OPENAI_API_KEY: "test-openai", PINECONE_API_KEY: "test-pc" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test("initializes with mocks, sets user, and wires QueryPipeline with vector namespace", async () => {
    const adapter = new AILangchainAdapter({ aiProvider: "openai" });

    // set user id to trigger PineconeStore + QueryPipeline
    adapter.setUserId("u-integration");

    // QueryPipeline should be constructed with LLM and requestQueue provided
  expect(mockQueryPipeline).toHaveBeenCalledTimes(1);
  const qpArgs = mockQueryPipeline.mock.calls[0][0];
    expect(qpArgs).toMatchObject({ llm: expect.any(Object), requestQueue: expect.any(Object) });

    // Assert namespacing via public behavior rather than internal properties
    const result = await adapter.respondToPrompt(
      "u-integration",
      "cX",
      "ping?",
      []
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        meta: expect.objectContaining({ vectorStoreNS: "u-integration" })
      })
    );
  });

  test("respondToPrompt delegates to QueryPipeline and returns success payload", async () => {
    const adapter = new AILangchainAdapter({ aiProvider: "openai" });
    adapter.setUserId("u1");

    const result = await adapter.respondToPrompt("u1", "c1", "hello?", [{ role: "user", content: "hi" }]);

    expect(result).toMatchObject({ success: true, response: "ok:hello?", conversationId: "c1" });
  });

  test("processPushedRepo delegates to DataPreparationPipeline and returns processing result", async () => {
    const adapter = new AILangchainAdapter({ aiProvider: "openai" });
    const out = await adapter.processPushedRepo("u2", "r2", { url: "https://github.com/org/repo.git", branch: "main" });

    expect(out).toMatchObject({ success: true, userId: "u2", repoId: "r2", repoUrl: "https://github.com/org/repo.git" });
  });
});
