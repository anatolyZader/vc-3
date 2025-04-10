/* eslint-disable no-unused-vars */
'use strict';

class IWikiMessagingPort {
  constructor() {
    if (new.target === IWikiMessagingPort) {
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

module.exports = IWikiMessagingPort;
