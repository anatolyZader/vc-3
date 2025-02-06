// project_wiki_module/application/services/interfaces/IProjectWikiService.js
/* eslint-disable no-unused-vars */
'use strict';

class IProjectWikiService {
  async createPage(userId, title, content, projectwikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async fetchPagesList(userId,projectWikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async fetchPage(userId, pageId,projectWikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async renamePage(userId, pageId, newTitle,projectWikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async deletePage(userId, pageId,projectWikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async updatePageContent(userId, pageId, newContent,projectWikiPersistAdapter) {
    throw new Error("Method not implemented.");
  }
}

module.exports = IProjectWikiService;
