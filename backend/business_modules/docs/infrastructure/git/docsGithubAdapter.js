// docsGithubAdapter.js
/* eslint-disable no-console */
'use strict';

const IDocsGitPort = require('../../domain/ports/IDocsGitPort');
const octokit = require('../../../../octokitPlugin');

class DocsGithubAdapter extends IDocsGitPort {
  constructor(options = {}) {
    super();
    if (!process.env.GITHUB_TOKEN && !options.githubToken) {
      throw new Error('Missing githubToken for authentication.');
    }
    this.apiBaseUrl = 'https://api.github.com';
    this.octokit = octokit;
  }

  

  async fetchDocs( repoId) {
    // Expect repoId in "owner/repo" format.
    const [owner, repo] = repoId.split('/');
    // The docs repository is typically named "<repo>.docs"
    const docsRepo = `${repo}.docs`;
    try {
      const response = await this.octokit.rest.repos.downloadZipballArchive({
        owner,
        repo: docsRepo,
        ref: 'amber'
      });
      console.log(`Docs for 'amber' branch downloaded for repository: ${repoId}`);
      // response.data returns the ZIP archive data (stream or buffer).
      return response.data;
    } catch (error) {
      console.error(`Error fetching docs for repository ${repoId} :`, error.message);
      throw error;
    }
  }

    async fetchPage(pageId) {
    console.log(`[DocsGithubAdapter] fetchPage called for pageId: ${pageId} by user: anatolyZader at 2025-06-07 13:04:46`);
  }

  async createPage(pageTitle) {
    console.log(`[DocsGithubAdapter] createPage called for pageTitle: ${pageTitle} by user: anatolyZader at 2025-06-07 13:04:46`);
  }

  async updatePage(pageId, newContent) {
    console.log(`[DocsGithubAdapter] updatePage called for pageId: ${pageId} by user: anatolyZader at 2025-06-07 13:04:46`);
  }

  async deletePage(pageId) {
    console.log(`[DocsGithubAdapter] deletePage called for pageId: ${pageId} by user: anatolyZader at 2025-06-07 13:04:46`);
  }
}

module.exports = DocsGithubAdapter;
