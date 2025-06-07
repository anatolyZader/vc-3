// wikiGithubAdapter.js
/* eslint-disable no-console */
'use strict';

const IWikiGitPort = require('../../domain/ports/IWikiGitPort');
const octokit = require('../../../git/plugins/octokitPlugin');

class WikiGithubAdapter extends IWikiGitPort {
  constructor(options = {}) {
    super();
    if (!process.env.GITHUB_TOKEN && !options.githubToken) {
      throw new Error('Missing githubToken for authentication.');
    }
    this.apiBaseUrl = 'https://api.github.com';
    this.octokit = octokit;
  }

  

  async fetchWiki( repoId) {
    // Expect repoId in "owner/repo" format.
    const [owner, repo] = repoId.split('/');
    // The wiki repository is typically named "<repo>.wiki"
    const wikiRepo = `${repo}.wiki`;
    try {
      const response = await this.octokit.rest.repos.downloadZipballArchive({
        owner,
        repo: wikiRepo,
        ref: 'amber'
      });
      console.log(`Wiki for 'amber' branch downloaded for repository: ${repoId}`);
      // response.data returns the ZIP archive data (stream or buffer).
      return response.data;
    } catch (error) {
      console.error(`Error fetching wiki for repository ${repoId} :`, error.message);
      throw error;
    }
  }

    async fetchPage(pageId) {
    console.log(`[WikiGithubAdapter] fetchPage called for pageId: ${pageId} by user: anatolyZader at 2025-06-07 13:04:46`);
  }

  async createPage(pageTitle) {
    console.log(`[WikiGithubAdapter] createPage called for pageTitle: ${pageTitle} by user: anatolyZader at 2025-06-07 13:04:46`);
  }

  async updatePage(pageId, newContent) {
    console.log(`[WikiGithubAdapter] updatePage called for pageId: ${pageId} by user: anatolyZader at 2025-06-07 13:04:46`);
  }

  async deletePage(pageId) {
    console.log(`[WikiGithubAdapter] deletePage called for pageId: ${pageId} by user: anatolyZader at 2025-06-07 13:04:46`);
  }
}

module.exports = WikiGithubAdapter;
