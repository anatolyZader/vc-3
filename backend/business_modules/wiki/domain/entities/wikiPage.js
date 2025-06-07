// wikiPage.js
/* eslint-disable no-unused-vars */
'use strict';

const WikiPageTitle = require('../value_objects/wikiPageTitle');

class WikiPage {
  constructor(userId, repoId) {
    this.userId = userId;
    this.repoId = repoId;
  }

  async fetchPage(pageId, IWikiGitPort) { 
    const page = await IWikiGitPort.fetchPage(pageId); 
    return page;
  }

  async createPage(pageTitle, IWikiGitPort) {
    const createdPage = await IWikiGitPort.createPage(pageTitle);
    console.log(`Wiki page ${pageTitle} created for user ${this.userId} and repo ${this.repoId}`);
    return createdPage
  }

  async updatePage(pageId, newContent, IWikiGitPort) {
    const result = await IWikiGitPort.updatePage(pageId, newContent);
    console.log(`Wiki page ${pageId} content updated.`);
    return result;
  }

  async deletePage(pageId, IWikiGitPort) {
    const result = await IWikiGitPort.deletePage(pageId);
    console.log(`Wiki page ${pageId} deleted.`);
    return result
  }

}

module.exports = WikiPage;
