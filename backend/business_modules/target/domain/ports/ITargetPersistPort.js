'use strict';
/* eslint-disable no-unused-vars */

class ItargetPersistPort {
  constructor() {
    if (new.target === ItargetPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // Fetches a target module by ID.
  async fetchtarget(moduleId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = ItargetPersistPort;
