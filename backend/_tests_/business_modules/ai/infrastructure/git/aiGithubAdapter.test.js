'use strict';
const path = require('path');

describe('AIGithubAdapter', () => {
  test('constructs with options and exposes fetchRepo', () => {
    const AIGithubAdapter = require(path.resolve(__dirname, '../../../../../business_modules/ai/infrastructure/git/aiGithubAdapter.js'));
    const a = new AIGithubAdapter({ githubToken: 't', owner: 'o', repoId: 'r' });
    expect(a.githubToken).toBe('t');
    expect(a.owner).toBe('o');
    expect(a.repoId).toBe('r');
    expect(typeof a.fetchRepo).toBe('function');
  });
});
