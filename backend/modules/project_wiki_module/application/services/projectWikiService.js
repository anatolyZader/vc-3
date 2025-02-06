// projectWikiService.js
'use strict';

const WikiPage = require('../../domain/entities/wikiPage');

class WikiService {
  constructor(projectWikiPersistAdapter) {
    this.wikiPersistAdapter = projectWikiPersistAdapter;
  }

  async createPage(userId, title, content) {
    const wikiPage = new WikiPage(userId, title, content);
    await wikiPage.create(this.wikiPersistAdapter);
    return wikiPage.pageId;
  }

  async fetchPagesList(userId) {
    const pagesList = await this.wikiPersistAdapter.fetchPagesList(userId);
    return pagesList;
  }

  async fetchPage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    wikiPage.pageId = pageId;
    return await wikiPage.fetchPage(this.wikiPersistAdapter);
  }

  async renamePage(userId, pageId, newTitle) {
    const wikiPage = new WikiPage(userId);
    wikiPage.pageId = pageId;
    await wikiPage.rename(newTitle, this.wikiPersistAdapter);
  }

  async deletePage(userId, pageId) {
    await this.wikiPersistAdapter.deletePage(userId, pageId);
  }

  async updatePageContent(userId, pageId, newContent) {
    await this.wikiPersistAdapter.updatePageContent(pageId, newContent);
  }
}

module.exports = WikiService;
