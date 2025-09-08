/* eslint-disable no-unused-vars */
'use strict';

class IDocsAiPort {
  constructor() {
    if (new.target === IDocsAiPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async updateDocsFiles() {
    throw new Error('Method not implemented.');
  }
}

module.exports = IDocsAiPort;
