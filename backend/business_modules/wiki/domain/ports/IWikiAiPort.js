/* eslint-disable no-unused-vars */
'use strict';

class IWikiAiPort {
  constructor() {
    if (new.target === IWikiAiPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async updateWikiFiles() {
    throw new Error('Method not implemented.');
  }
}

module.exports = IWikiAiPort;
