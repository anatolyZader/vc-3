"use strict";

const path = require("path");

// Stub orchestrators and processors used inside DataPreparationPipeline to avoid heavy work
jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/orchestrators/commitManager",
  () => jest.fn().mockImplementation(() => ({
    getCommitInfoOptimized: jest.fn(async () => ({ hash: "h1", subject: "s" }))
  }))
);

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/orchestrators/processingStrategyManager",
  () => jest.fn().mockImplementation(() => ({
    processIncrementalOptimized: jest.fn(async () => ({ success: true, mode: "incremental" })),
    processFullRepositoryOptimized: jest.fn(async () => ({ success: true, mode: "full" }))
  }))
);

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/orchestrators/documentProcessingOrchestrator",
  () => jest.fn().mockImplementation(() => ({
    processFullRepositoryWithProcessors: jest.fn(async () => ({ success: true, docs: 3 }))
  }))
);

jest.mock(
  "../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/orchestrators/eventManager",
  () => jest.fn().mockImplementation(() => ({
    emitProcessingStarted: jest.fn(),
    emitProcessingSkipped: jest.fn(),
    emitProcessingCompleted: jest.fn(),
    emitProcessingError: jest.fn(),
    emitRagStatus: jest.fn()
  }))
);

// Keep processors as real (constructor side-effects are light); we won't call heavy methods directly
const DataPreparationPipeline = require("../../../../business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/dataPreparationPipeline");

describe("DataPreparationPipeline integration", () => {
  test("processPushedRepo validates input and triggers full processing", async () => {
    const pipeline = new DataPreparationPipeline({ embeddings: {}, pinecone: {}, eventBus: {} });
    const out = await pipeline.processPushedRepo("u", "r", { url: "https://github.com/o/repo.git", branch: "main" });
    expect(out).toMatchObject({ success: true });
  });

  test("processPushedRepo errors on invalid repo data", async () => {
    const pipeline = new DataPreparationPipeline({});
    const out = await pipeline.processPushedRepo("u", "r", { url: "missing-branch" });
    expect(out).toMatchObject({ success: false });
  });
});
