'use strict';
/* eslint-disable no-unused-vars */

class ITargetCodePersistPort {
  constructor() {
    if (new.target === ITargetCodePersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // Fetches a target module by ID.
  async fetchTargetCode(moduleId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = ITargetCodePersistPort;
