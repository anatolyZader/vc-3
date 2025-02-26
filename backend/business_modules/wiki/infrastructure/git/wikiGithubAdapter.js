// wikiGitHubAdapter.js
'use strict';


class WikiGithubAdapter {
  constructor(options = {}) {
    this.githubToken = options.githubToken;
    this.apiBaseUrl = 'https://api.github.com';
  }


  async fetchTarget(targetRepoId) {
    console.log(`Fetching target with id ${targetRepoId} from Github...`);
  }
}

module.exports = WikiGithubAdapter;
