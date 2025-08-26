// IdocsService.js
/* eslint-disable no-unused-vars */
'use strict';

class IDocsService {

  async fetchDocs(userId, repoId) {
    throw new Error("Method not implemented.");
  }

  async fetchPage(userId, repoId, pageId) {
    throw new Error("Method not implemented.");
  }

  async createPage(userId, repoId, pageTitle) {
    throw new Error("Method not implemented.");
  }

  async updatePage(userId, repoId, pageId, newContent) {
    throw new Error("Method not implemented.");
  }

  async deletePage(userId, repoId, pageId) {
    throw new Error("Method not implemented.");
  }

  async analyzePage(userId, pageId) {
    throw new Error("Method not implemented.");
  }

  async updateDocsFiles() {
    throw new Error("Method not implemented.");
  }
}

module.exports = IDocsService;