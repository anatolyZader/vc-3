"use strict";

const path = require("path");

// Mocks
const VectorSearchOrchestratorMock = jest.fn().mockImplementation(() => ({
  performSearch: jest.fn(async () => ([
    { pageContent: "doc1", metadata: { source: "s1", type: "apiSpec" } },
    { pageContent: "doc2", metadata: { source: "s2", repoId: "r1" } }
  ]))
}));

jest.mock(
  path.join(__dirname, "../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator"),
  () => VectorSearchOrchestratorMock
);

const ContextBuilderMock = {
  formatContext: jest.fn((docs) => ({
    context: docs.map(d => d.pageContent).join("\n"),
    sourceAnalysis: { apiSpec: 1, rootDocumentation: 0, moduleDocumentation: 0, githubRepo: 1 },
    sourcesBreakdown: ["s1", "s2"]
  }))
};

jest.mock(
  path.join(__dirname, "../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/contextBuilder"),
  () => ContextBuilderMock
);

const ResponseGeneratorMock = jest.fn().mockImplementation(() => ({
  generateWithContext: jest.fn(async () => ({ content: "with-context" })),
  generateStandard: jest.fn(async () => ({ content: "standard" })),
  isRateLimitError: jest.fn(() => false)
}));

jest.mock(
  path.join(__dirname, "../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/responseGenerator"),
  () => ResponseGeneratorMock
);

const QueryPipeline = require("../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline");

describe("QueryPipeline integration", () => {
  test("respondToPrompt returns RAG response when vectorStore and pinecone present", async () => {
    const qp = new QueryPipeline({
      vectorStore: { /* not used because orchestrator mocked */ },
      pinecone: { /* present */ },
      embeddings: {}
    });

    const out = await qp.respondToPrompt("u", "c", "how to?", [], {});
    expect(out).toMatchObject({ success: true, ragEnabled: true, response: "with-context" });
    expect(ContextBuilderMock.formatContext).toHaveBeenCalled();
  });

  test("respondToPrompt indicates standard response when vector store missing", async () => {
    const qp = new QueryPipeline({ pinecone: {} });
    const out = await qp.respondToPrompt("u", "c", "question", [], null);
    expect(out).toMatchObject({ success: true, useStandardResponse: true });
  });

  test("generateStandardResponse returns non-RAG payload", async () => {
    const qp = new QueryPipeline({});
    const res = await qp.generateStandardResponse("hello", "c1", [{ role: "user", content: "h" }]);
    expect(res).toMatchObject({ success: true, ragEnabled: false, response: "standard", conversationId: "c1" });
  });
});
