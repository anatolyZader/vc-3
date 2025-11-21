// IApiPort.js
'use strict';
/* eslint-disable no-unused-vars */

class IApiPort {
  constructor() {
    if (new.target === IApiPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // Fetches data for an existing repository.
  async fetchHttpApi(userId, repoId) {
    throw new Error('Method not implemented.');
  }

}
module.exports = IApiPort;
