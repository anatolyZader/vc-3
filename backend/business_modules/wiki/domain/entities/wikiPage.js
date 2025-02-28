// project_wiki_module/wikiPage.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const WikiPageTitle = require('../value_objects/wikiPageTitle');

class WikiPage {
  constructor(userId) {
    this.userId = userId;
  }

  async fetchPage(pageId, IWikiGitPort) { 
  const page = await IWikiGitPort.fetchPage(this.userId, pageId); 
  return page;
  }

  async analyzePage(pageId, IWikiAIPort, IWikiGitPort) {
    const pageData = await IWikiGitPort.fetchPage(pageId);
    const analysisResult = await IWikiAIPort.analyzePage(pageData);
    return analysisResult;
  }

  async createPage(pageTitle, IWikiGitPort) {
    await IWikiGitPort.createPage(pageTitle);
    console.log(`Wiki page ${pageTitle} created for user ${this.userId}.`);
  }

  async updatePage(pageId, newContent, IWikiGitPort) {
    await IWikiGitPort.updatePage(pageId, newContent);
    console.log(`Wiki page ${pageId} content updated.`);
  }

  async deletePage(pageId, IWikiGitPort) {
    await IWikiGitPort.deletePage(pageId);
    console.log(`Wiki page ${pageId} deleted.`);
  }


}

module.exports = WikiPage;
