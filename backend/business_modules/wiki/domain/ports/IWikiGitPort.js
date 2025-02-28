/* eslint-disable no-unused-vars */
'use strict';

class IWikiGitPort {
  constructor() {
    if (new.target === IWikiGitPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
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

module.exports = IWikiGitPort;
