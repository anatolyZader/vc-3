'use strict';
/* eslint-disable no-unused-vars */

class IApiService {
  constructor() {
    if (new.target === IApiService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async fetchHttpApi(userId, repoId) {
    throw new Error('fetchHttpApi() Method not implemented.');
  }

}

module.exports = IApiService;
