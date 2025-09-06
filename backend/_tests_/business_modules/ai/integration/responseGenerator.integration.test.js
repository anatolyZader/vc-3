"use strict";

const path = require("path");

// Minimal PromptSelector/Config stubs to satisfy generateWithContext path
jest.mock(
  path.join(__dirname, "../../../../../business_modules/ai/infrastructure/ai/prompts/index"),
  () => ({
    PromptSelector: {
      selectPrompt: jest.fn(() => "sys")
    }
  })
);

jest.mock(
  path.join(__dirname, "../../../../../business_modules/ai/infrastructure/ai/prompts/promptConfig"),
  () => ({
    keywords: { application: ["eventstorm"], general: ["what", "how"] },
    logging: { logPromptSelection: false }
  })
);

const ResponseGenerator = require("../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/responseGenerator");

function makeLLM() {
  return { invoke: jest.fn(async (messages) => ({ content: "resp" })) };
}

function makeQueue() {
  return {
    maxRetries: 2,
    checkRateLimit: jest.fn(async () => true),
    waitWithBackoff: jest.fn(async () => {})
  };
}

describe("ResponseGenerator integration", () => {
  test("generateWithContext builds messages and returns content", async () => {
    const rg = new ResponseGenerator(makeLLM(), makeQueue());

    const ctx = { context: "C1", sourceAnalysis: { apiSpec: 1, rootDocumentation: 0, moduleDocumentation: 0, githubRepo: 0 } };
    const out = await rg.generateWithContext("how to?", ctx, [{ prompt: "p", response: "r" }]);
    expect(out).toEqual({ content: "resp" });
  });

  test("generateStandard returns content without RAG context", async () => {
    const rg = new ResponseGenerator(makeLLM(), makeQueue());
    const out = await rg.generateStandard("hello", [{ prompt: "p", response: "r" }]);
    expect(out).toEqual({ content: "resp" });
  });
});
