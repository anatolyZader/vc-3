/* eslint-disable no-unused-vars */
'use strict';

class IGitWikiPersistPort {
  constructor() {
    if (new.target === IGitWikiPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async createPage(userId, newPage) {
    throw new Error('Method not implemented.');
  }

  async updatePageContent(pageId, newContent) {
    throw new Error('Method not implemented.');
  }

  async renamePage(pageId, newTitle) {
    throw new Error('Method not implemented.');
  }

  async fetchPage(userId, pageId) {
    throw new Error('Method not implemented.');
  }

  async fetchPages(userId) {
    throw new Error('Method not implemented.');
  }

  async deletePage(userId, pageId) {
    throw new Error('Method not implemented.');
  }

  async searchInPages(userId, query) {
    throw new Error('Method not implemented.');
  }


}

module.exports = IGitWikiPersistPort;
