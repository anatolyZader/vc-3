// project_wiki_module/application/services/interfaces/IwikiService.js
/* eslint-disable no-unused-vars */
'use strict';

class IwikiService {
  async createPage(userId, title, content, wikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async fetchPagesList(userId,wikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async fetchPage(userId, pageId,wikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async renamePage(userId, pageId, newTitle,wikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async deletePage(userId, pageId,wikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async updatePageContent(userId, pageId, newContent,wikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }
}

module.exports = IwikiService;
