// IWikiAIPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IWikiAIPort {
  constructor() {
    if (new.target === IWikiAIPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async analyzePage(pageId) {
    throw new Error('Method not implemented.');
  }

}

module.exports = IWikiAIPort;
