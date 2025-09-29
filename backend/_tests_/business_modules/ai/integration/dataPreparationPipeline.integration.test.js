"use strict";

const path = require("path");

// Stub orchestrators and processors used inside ContextPipeline to avoid heavy work
jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoSelector",
  () => jest.fn().mockImplementation(() => ({
    getCommitInfoOptimized: jest.fn(async () => ({ hash: "h1", subject: "s" }))
  }))
);

// These mocks may not be needed for ContextPipeline - commenting out non-existent modules
/*
jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/orchestrators/processingStrategyManager",
  () => jest.fn().mockImplementation(() => ({
    processIncrementalOptimized: jest.fn(async () => ({ success: true, mode: "incremental" })),
    processFullRepositoryOptimized: jest.fn(async () => ({ success: true, mode: "full" }))
  }))
);

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/orchestrators/repositoryProcessingOrchestrator",
  () => jest.fn().mockImplementation(() => ({
    processFullRepositoryWithProcessors: jest.fn(async () => ({ success: true, docs: 3 }))
  }))
);
*/

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor",
  () => jest.fn().mockImplementation(() => ({
    loadDocumentsWithLangchain: jest.fn(async () => ([{ pageContent: "test doc", metadata: { source: "test" } }])),
    processFilteredDocuments: jest.fn(async () => ({ success: true, documentsProcessed: 1, chunksGenerated: 3 }))
  }))
);

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoLoader",
  () => jest.fn().mockImplementation(() => ({
    findExistingRepo: jest.fn(async () => null),
    sanitizeId: jest.fn(id => id.replace(/[^a-zA-Z0-9_-]/g, '_')),
    storeRepositoryTrackingInfo: jest.fn(async () => ({ success: true }))
  }))
);

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/eventManager",
  () => jest.fn().mockImplementation(() => ({
    emitProcessingStarted: jest.fn(),
    emitProcessingSkipped: jest.fn(),
    emitProcessingCompleted: jest.fn(),
    emitProcessingError: jest.fn(),
    emitRagStatus: jest.fn()
  }))
);

// Keep processors as real (constructor side-effects are light); we won't call heavy methods directly
const ContextPipeline = require("../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline");

describe("ContextPipeline integration", () => {
  test("processPushedRepo validates input and triggers full processing", async () => {
    const pipeline = new ContextPipeline({ embeddings: {}, pinecone: {}, eventBus: {} });
    const out = await pipeline.processPushedRepo("u", "r", { url: "https://github.com/o/repo.git", branch: "main" });
    expect(out).toMatchObject({ success: true });
  });

  test("processPushedRepo errors on invalid repo data", async () => {
    const pipeline = new ContextPipeline({});
    const out = await pipeline.processPushedRepo("u", "r", { url: "missing-branch" });
    expect(out).toMatchObject({ success: false });
  });
});
