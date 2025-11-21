'use strict';
const path = require('path');

describe('AIGithubDocsAdapter', () => {
  test('exposes fetchDocs method', () => {
    const AIGithubDocsAdapter = require(path.resolve(__dirname, '../../../../../business_modules/ai/infrastructure/docs/aiGithubDocsAdapter.js'));
    const a = new AIGithubDocsAdapter();
    expect(typeof a.fetchDocs).toBe('function');
  });
});
