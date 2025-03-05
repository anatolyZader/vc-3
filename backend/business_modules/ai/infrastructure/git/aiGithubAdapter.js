// aiGithubAdapter.js
'use strict';
/* eslint-disable no-unused-vars */

class AIGithubAdapter {
  constructor(options = {}) {
    this.githubToken = options.githubToken;
    this.owner = options.owner; // e.g. 'my-github-username'
    this.repoId = options.repoId;   // e.g. 'my-wiki-repo'
    this.apiBaseUrl = 'https://api.github.com';
  }

  _getHeaders() {
    return {
      'Authorization': `token ${this.githubToken}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchRepository(repoId) {
  console.log("fetching repo via git module");
  }

  
}

module.exports = AIGithubAdapter;
