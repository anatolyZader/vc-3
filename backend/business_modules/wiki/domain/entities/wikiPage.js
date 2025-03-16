// wikiPage.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const WikiPageTitle = require('../value_objects/wikiPageTitle');

class WikiPage {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchPage(repoId, pageId, IWikiMessagingPort) { 
  const page = await IWikiMessagingPort.fetchPage(this.userId, repoId, pageId); 
  return page;
  }

  async createPage(pageTitle, IWikiMessagingPort) {
    await IWikiMessagingPort.createPage(pageTitle);
    console.log(`Wiki page ${pageTitle} created for user ${this.userId}.`);
  }

  async updatePage(pageId, newContent, IWikiMessagingPort) {
    await IWikiMessagingPort.updatePage(pageId, newContent);
    console.log(`Wiki page ${pageId} content updated.`);
  }

  async deletePage(pageId, IWikiMessagingPort) {
    await IWikiMessagingPort.deletePage(pageId);
    console.log(`Wiki page ${pageId} deleted.`);
  }


}

module.exports = WikiPage;
