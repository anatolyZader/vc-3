// IDocsGitPort.js
/*  eslint-disable no-unused-vars */
'use strict';

class IDocsGitPort {
  constructor() {
    if (new.target === IDocsGitPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async fetchDocs(repoId) { 
    throw new Error('Method not implemented.');
  }

  async fetchPage(pageId) {
    throw new Error('Method not implemented.');
  }  

  async createPage(pageTitle) {
    throw new Error('Method not implemented.');
  }

  async updatePage(pageId, newContent) {
    throw new Error('Method not implemented.');
  }

  async deletePage(pageId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IDocsGitPort;