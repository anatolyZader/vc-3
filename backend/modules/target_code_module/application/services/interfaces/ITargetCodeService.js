'use strict';
/* eslint-disable no-unused-vars */

class ITargetCodeService {
    constructor() {
        if (new.target === ITargetCodeService) {
          throw new Error('Cannot instantiate an abstract class.');
        }
      }
  async fetchTargetCode(moduleId, ITargetCodePersistPort) {
    throw new Error('Method not implemented.');
  }
}

module.exports = ITargetCodeService;
