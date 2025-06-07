'use strict';
/* eslint-disable no-unused-vars */

class IGitService {
  constructor() {
    if (new.target === IGitService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async fetchRepo(userId, repoId) {
    throw new Error('Method not implemented.');
  }

  async fetchWiki(userId, repoId) {
    throw new Error('Method not implemented.');
  }

}

module.exports = IGitService;
