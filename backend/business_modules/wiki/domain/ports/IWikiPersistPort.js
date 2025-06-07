// IWikiPostgresPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IWikiPostgresPort {
  constructor() {
    if (new.target === IWikiPostgresPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async persistWiki(userId, repoId, fetchedWiki) { 
    throw new Error('Method not implemented.');
  }

  async readWiki(userId, repoId) {
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

module.exports = IWikiPostgresPort;
