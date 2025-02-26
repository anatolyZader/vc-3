'use strict';
/* eslint-disable no-unused-vars */

class ItargetService {
    constructor() {
        if (new.target === ItargetService) {
          throw new Error('Cannot instantiate an abstract class.');
        }
      }
  async fetchtarget(moduleId, ItargetPersistPort) {
    throw new Error('Method not implemented.');
  }
}

module.exports = ItargetService;
