// IDocsPostgresPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IDocsPostgresPort {
  constructor() {
    if (new.target === IDocsPostgresPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async persistDocs(userId, repoId, fetchedDocs) { 
    throw new Error('Method not implemented.');
  }

  async readDocs(userId, repoId) {
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

module.exports = IDocsPostgresPort;
