// project_wiki_module/application/services/interfaces/IwikiService.js
/* eslint-disable no-unused-vars */
'use strict';

class IWikiService {

  async fetchPage(userId, pageId) {
    throw new Error("Method not implemented.");
  }

  async createPage(userId, title) {
    throw new Error("Method not implemented.");
  }

  async analyzePage(userId, pageId) {
    throw new Error("Method not implemented");
  }


  async deletePage(userId, pageId) {
    throw new Error("Method not implemented.");
  }

  async updatePage(userId, pageId, newContent) {
    throw new Error("Method not implemented.");
  }
}

module.exports = IWikiService;
