// gitGithubAdapter.js
/* eslint-disable no-console */

'use strict';

const IGitPort = require('../../domain/ports/IGitPort');
const octokit = require('./../../plugins/octokitPlugin');

class GitGithubAdapter extends IGitPort {
  constructor(options = {}) {
    super();
    if (!process.env.GITHUB_TOKEN && !options.githubToken) {
      throw new Error('Missing githubToken for authentication.');
    }
    this.apiBaseUrl = 'https://api.github.com';
    this.octokit = octokit;
  }

  async fetchRepo(userId, repoId) {
    // Expect repoId in "owner/repo" format.
    console.log(`Github token at gitGithubAdapter/fetchRepo: ${process.env.GITHUB_TOKEN}`);
    const [owner, repo] = repoId.split('/');
    try {
      // Fetch repository details.
      const repoResponse = await this.octokit.rest.repos.get({
        owner,
        repo,
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      // Fetch the specific branch details for 'amber'.
      const branchResponse = await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: 'amber',
        headers: {
          accept: 'application/vnd.github+json'
        }
      });

      console.log(`Repository and 'amber' branch fetched: ${repoId}`);
      
      // Combine repository data and branch details.
      const data = {
        repository: repoResponse.data,
        branch: branchResponse.data
      };

      return data;
    } catch (error) {
      console.error(`Error fetching repository ${repoId} or branch 'amber':`, error.message);
      throw error;
    }
  }

  async fetchWiki(userId, repoId) {
    // Expect repoId in "owner/repo" format.
    const [owner, repo] = repoId.split('/');
    // The wiki repository is typically named "<repo>.wiki"
    const wikiRepo = `${repo}.wiki`;
    try {
      // Download the wiki archive using the zipball endpoint.
      // Here, we are specifying the 'amber' branch as the ref.
      const response = await this.octokit.rest.repos.downloadZipballArchive({
        owner,
        repo: wikiRepo,
        ref: 'amber'
      });
      console.log(`Wiki for 'amber' branch downloaded for repository: ${repoId}`);
      // response.data returns the ZIP archive data (stream or buffer).
      return response.data;
    } catch (error) {
      console.error(`Error fetching wiki for repository ${repoId}:`, error.message);
      throw error;
    }
  }
}

module.exports = GitGithubAdapter;
