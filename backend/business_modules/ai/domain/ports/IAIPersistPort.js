// IAIPersistPort.js
/* eslint-disable no-unused-vars */
'use strict';

class IAIPersistPort {
  constructor() {
    if (new.target === IAIPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async saveAiResponse() { throw new Error('Method not implemented.'); }
  async saveRepoPush() { throw new Error('Method not implemented.'); }
}

module.exports = IAIPersistPort;
