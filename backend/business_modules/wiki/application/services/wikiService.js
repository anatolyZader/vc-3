'use strict';

const WikiPage = require('../../domain/entities/wikiPage');
const IWikiService = require('./interfaces/IWikiService');

class WikiService extends IWikiService {

  constructor(wikiGitAdapter, wikiMessagingAdapter, wikiAIAdapter) {
    super() 
    this.wikiMessagingAdapter = wikiMessagingAdapter;
    this.wikiGitAdapter = wikiGitAdapter;
    this.wikiAIAdapter = wikiAIAdapter;
  }

  async fetchPage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    return await wikiPage.fetchPage(pageId, this.wikiGitAdapter);
  }

  async createPage(userId, title) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.createPage(title, this.wikiGitAdapter);
    return wikiPage.pageId;
  }

  async updatePage(userId, pageId, newContent) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.updatePage(pageId, newContent, this.wikiGitAdapter);
  }

  async analyzePage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    const pageData = await wikiPage.fetchPage(pageId, this.wikiGitAdapter);
    const analysisResult = await this.wikiAIAdapter.analyzePage(pageData);
    return analysisResult;
  }

  async deletePage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.deletePage(pageId,  this.wikiGitAdapter);
  }
}

module.exports = WikiService;
