// docsPage.js
/* eslint-disable no-unused-vars */
'use strict';

const DocsPageTitle = require('../value_objects/docsPageTitle');

class DocsPage {
  constructor(userId, repoId) {
    this.userId = userId;
    this.repoId = repoId;
  }

  async fetchPage(pageId, IDocsGitPort) { 
    const page = await IDocsGitPort.fetchPage(pageId); 
    return page;
  }

  async createPage(pageTitle, IDocsGitPort) {
    const createdPage = await IDocsGitPort.createPage(pageTitle);
    console.log(`Docs page ${pageTitle} created for user ${this.userId} and repo ${this.repoId}`);
    return createdPage
  }

  async updatePage(pageId, newContent, IDocsGitPort) {
    const result = await IDocsGitPort.updatePage(pageId, newContent);
    console.log(`Docs page ${pageId} content updated.`);
    return result;
  }

  async deletePage(pageId, IDocsGitPort) {
    const result = await IDocsGitPort.deletePage(pageId);
    console.log(`Docs page ${pageId} deleted.`);
    return result
  }

}

module.exports = DocsPage;
