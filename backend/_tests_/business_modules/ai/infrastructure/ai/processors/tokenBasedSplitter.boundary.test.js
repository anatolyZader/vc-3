"use strict";

const path = require("path");

const splitterPath = path.resolve(
  __dirname,
  "../../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/tokenBasedSplitter.js"
);

describe("TokenBasedSplitter.findBestSeparatorBoundary", () => {
  let TokenBasedSplitter;

  beforeEach(() => {
    jest.resetModules();
    TokenBasedSplitter = require(splitterPath);
  });

  test("ignores empty separator and does not snap to end", () => {
    const tbs = new TokenBasedSplitter({ maxTokens: 1000, overlapTokens: 0 });
    const text = "function alpha() {\n  console.log('a');\n}\n\nfunction beta() {\n  console.log('b');\n}\n// trailing";
    // separators include '' at end in production usage; we simulate that
    const separators = ['\n\n', '\n', ' ', ''];
    const rough = text.substring(0, Math.floor(text.length * 0.95)); // emulate earlier candidate
    const snapped = tbs.findBestSeparatorBoundary(rough, separators);
    expect(snapped.length).toBeLessThan(rough.length); // should trim back to a boundary
    expect(snapped.endsWith('\n\n') || snapped.endsWith('\n') || snapped.endsWith(' ')).toBeTruthy();
  });

  test("returns original when no separator past threshold", () => {
    const tbs = new TokenBasedSplitter({});
    const text = "abcdefghijklmno"; // no separators
    const separators = ['\n\n', '\n', ' ', ''];
    const snapped = tbs.findBestSeparatorBoundary(text, separators);
    expect(snapped).toBe(text);
  });
});
