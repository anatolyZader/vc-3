// githubAdapter.js
'use strict';

const IGitGitPort = require('../../domain/ports/IGitGitPort');

class GitGithubAdapter extends IGitGitPort {
  constructor(options = {}) {
    super();
    this.githubToken = options.githubToken;
    this.apiBaseUrl = 'https://api.github.com';
  }

  async fetchRepo(userId, repoId) {
    const url = `${this.apiBaseUrl}/repos/${repoId}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`HTTP ${response.status} - ${errorMessage}`);
      }
      const data = await response.json();
      console.log(`Repository fetched: ${repoId}`);
      return data;
    } catch (error) {
      console.error(`Error fetching repository ${repoId}:`, error.message);
      throw error;
    }
  }
}

module.exports = GitGithubAdapter;
