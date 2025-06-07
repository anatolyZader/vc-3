'use strict';

const Wiki = require('../../domain/entities/wiki');
const WikiPage = require('../../domain/entities/wikiPage');
const IWikiService = require('./interfaces/IWikiService');

class WikiService extends IWikiService {

  constructor({WikiGitAdapter, WikiMessagingAdapter, WikiPersistAdapter}) {
    super();
    this.wikiGitAdapter = WikiGitAdapter;
    this.wikiMessagingAdapter = WikiMessagingAdapter;
    this.wikiPersistAdapter = WikiPersistAdapter;
  }

  async fetchWiki(userId, repoId) {
    const wiki = new Wiki(userId);    
    const fetchedWiki = await wiki.fetchWiki(repoId, this.wikiGitAdapter); 
    if (!fetchedWiki) {
      throw new Error(`Wiki not found for user ${userId} and repo ${repoId}`);
    }
    await this.wikiPersistAdapter.persistWiki(userId, repoId, fetchedWiki);    
    await this.wikiMessagingAdapter.publishFetchedWikiEvent(fetchedWiki);
    return fetchedWiki;
  }

  async fetchPage(userId, repoId, pageId) {
    const wikiPage = new WikiPage(userId, repoId);
    const page = await wikiPage.fetchPage(pageId, this.wikiGitAdapter);
    return page;
  }

  async createPage(userId, repoId, pageTitle) {
    const wikiPage = new WikiPage(userId, repoId);
    const createdPage = await wikiPage.createPage(pageTitle, this.wikiGitAdapter);
    return createdPage; // Fixed: now returns the created page
  }
  
  async updatePage(userId, repoId, pageId, newContent) {
    const wikiPage = new WikiPage(userId, repoId);
    await wikiPage.updatePage(pageId, newContent, this.wikiGitAdapter);
  }

  async deletePage(userId, repoId, pageId) {
    const wikiPage = new WikiPage(userId, repoId);
    await wikiPage.deletePage(pageId, this.wikiGitAdapter);
  }
}

module.exports = WikiService;