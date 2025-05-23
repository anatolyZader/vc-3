'use strict';

const Wiki = require('../../domain/entities/wiki');
const WikiPage = require('../../domain/entities/wikiPage');
const IWikiService = require('./interfaces/IWikiService');

class WikiService extends IWikiService {

  constructor({wikiMessagingAdapter}) {
    super();
    this.wikiMessagingAdapter = wikiMessagingAdapter;
  }

  async fetchWiki(userId, repoId) {
    const wiki = new Wiki(userId);    
    const fetchedWiki = await wiki.fetchWiki(repoId, this.wikiMessagingAdapter);     
    return fetchedWiki;
  }

  async fetchPage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    const page = await wikiPage.fetchPage(pageId, this.wikiMessagingAdapter);
    return page;
  };

  async createPage(userId, title) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.createPage(title, this.wikiMessagingAdapter);
    }
  
  async updatePage(userId, pageId, newContent) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.updatePage(pageId, newContent, this.wikiMessagingAdapter);
  }

  async deletePage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.deletePage(pageId, this.wikiMessagingAdapter);
  }
}

module.exports = WikiService;
