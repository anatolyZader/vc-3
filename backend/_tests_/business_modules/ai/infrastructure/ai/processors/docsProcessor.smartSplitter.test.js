"use strict";

const path = require("path");

const docsProcessorPath = path.resolve(
  __dirname,
  "../../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/docsProcessor.js"
);

describe("DocsProcessor.createSmartSplitter", () => {
  let DocsProcessor;

  beforeEach(() => {
    jest.resetModules();
    DocsProcessor = require(docsProcessorPath);
  });

  function makeDoc(source) {
    return { pageContent: `content of ${source}`, metadata: { source } };
  }

  test("returns default splitter for empty docs array", async () => {
    const dp = new DocsProcessor({});
    const splitter = await dp.createSmartSplitter([]);
    expect(splitter).toBeDefined();
    expect(splitter.chunkSize).toBe(1500);
  });

  test("uses code-aware separators when code files present", async () => {
    const dp = new DocsProcessor({});
    const docs = [makeDoc("index.js"), makeDoc("util.ts"), makeDoc("README.md")];
    const splitter = await dp.createSmartSplitter(docs);
    // We can't rely on internal separators property (not guaranteed public); instead assert code path overlap
    expect(splitter.chunkOverlap).toBe(300); // code path uses 300 overlap
  });

  test("uses markdown-aware separators when only markdown present", async () => {
    const dp = new DocsProcessor({});
    const docs = [makeDoc("guide.md"), makeDoc("intro.MD")];
    const splitter = await dp.createSmartSplitter(docs);
    expect(splitter.separators).toBeDefined();
    const joined = splitter.separators.join("|");
    expect(joined).toMatch(/##/); // markdown headers
    expect(splitter.chunkOverlap).toBe(250);
  });

  test("language detection picks most frequent extension", async () => {
    const dp = new DocsProcessor({});
    const spy = jest.spyOn(dp, 'getMostCommonLanguage');
    const docs = [makeDoc("a.py"), makeDoc("b.py"), makeDoc("c.js")];
    const splitter = await dp.createSmartSplitter(docs);
    // Confirm language detection was invoked with expected extensions
    expect(spy).toHaveBeenCalled();
    const callArgs = spy.mock.calls[0][0];
    expect(callArgs).toEqual(expect.arrayContaining(['py','py','js']));
    // Code path still chosen -> overlap 300
    expect(splitter.chunkOverlap).toBe(300);
  });
});
