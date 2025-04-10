// targetGitAdapter.js
'use strict';


class TargetGithubAdapter {
  constructor(options = {}) {
    this.githubToken = options.githubToken;
    this.apiBaseUrl = 'https://api.github.com';
  }


  async fetchTarget(targetRepoId) {
    console.log(`Fetching target with id ${targetRepoId} from Github...`);
  }
}

module.exports = TargetGithubAdapter;
