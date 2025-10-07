'use strict';

const path = require('path');

describe('TextMatcher utility', () => {
  let TextMatcher;

  beforeEach(() => {
    jest.resetModules();
    TextMatcher = require(path.resolve(__dirname, '../../../../../../business_modules/ai/infrastructure/ai/rag_pipelines/query/textMatcher.js'));
  });

  test('containsKeywords detects presence of any keyword', () => {
    const text = 'This module registers a route and a controller';
    expect(TextMatcher.containsKeywords(text, ['missing', 'route'])).toBe(true);
    expect(TextMatcher.containsKeywords(text, ['foo', 'bar'])).toBe(false);
  });

  test('containsAnyKeywordGroup detects any group match', () => {
    const text = 'API endpoint implements controller logic';
    const groups = [['foo', 'bar'], ['controller', 'adapter'], ['x']];
    expect(TextMatcher.containsAnyKeywordGroup(text, groups)).toBe(true);
  });

  test('containsAllKeywords requires all items', () => {
    const text = 'vector search orchestrator pipeline';
    expect(TextMatcher.containsAllKeywords(text, ['vector', 'search'])).toBe(true);
    expect(TextMatcher.containsAllKeywords(text, ['vector', 'missing'])).toBe(false);
  });
});
