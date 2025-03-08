// WikiGithubAdapter.json
/* eslint-disable no-unused-vars */
'use strict';

class WikiGithubAdapter {
  constructor(options = {}) {
    this.githubToken = options.githubToken;
    this.owner = options.owner; // e.g. 'my-github-username'
    this.repo = options.repo;   // e.g. 'my-wiki-repo'
    this.apiBaseUrl = 'https://api.github.com';
    this.wikiFolder = options.wikiFolder || 'wiki';
  }

  _getHeaders() {
    return {
      'Authorization': `token ${this.githubToken}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchWiki(userId, repoId) {
    const path = `${this.wikiFolder}`;      
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
    const response = await fetch(url, { headers: this._getHeaders() });
    if (!response.ok) {
      throw new Error(`Failed to fetch wiki: ${response.statusText}`);
    }
    const data = await response.json();
    const pages = data.map(item => {
      const pageId = item.name.replace('.md', '');      
      return {
        pageId,
        title: item.name,
      };
    });
    return pages;
  }

  async fetchPage(userId, repoId, pageId) {
    const path = `${this.wikiFolder}/${pageId}.md`;
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
    const response = await fetch(url, { headers: this._getHeaders() });
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }
    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      pageId,
      title: data.name,
      content,
      sha: data.sha
    };
  }

  async createPage(pageTitle) {
    const slug = pageTitle.replace(/\s+/g, '-').toLowerCase();
    const pageId = `${Date.now()}-${slug}`;
    const path = `${this.wikiFolder}/${pageId}.md`;
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;

    const initialContent = '';
    const body = {
      message: `Create wiki page "${pageTitle}" by user ${this.userId}`,
      content: Buffer.from(initialContent).toString('base64')
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: this._getHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Failed to create page: ${response.statusText}`);
    }
    return pageId;
  }

  async updatePage(pageId, newContent) {
    const path = `${this.wikiFolder}/${pageId}.md`;
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;

    const getResponse = await fetch(url, { headers: this._getHeaders() });
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch current page for update: ${getResponse.statusText}`);
    }
    const getData = await getResponse.json();
    const sha = getData.sha;

    const body = {
      message: `Update wiki page ${pageId}`,
      content: Buffer.from(newContent).toString('base64'),
      sha
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: this._getHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Failed to update page: ${response.statusText}`);
    }
    return await response.json();
  }

  async deletePage(pageId) {
    const path = `${this.wikiFolder}/${pageId}.md`;
    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;

    const getResponse = await fetch(url, { headers: this._getHeaders() });
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch current page for deletion: ${getResponse.statusText}`);
    }
    const getData = await getResponse.json();
    const sha = getData.sha;

    const body = {
      message: `Delete wiki page ${pageId}`,
      sha
    };

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this._getHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Failed to delete page: ${response.statusText}`);
    }
    return await response.json();
  }
}

module.exports = WikiGithubAdapter;
