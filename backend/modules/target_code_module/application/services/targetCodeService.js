'use strict';
/* eslint-disable no-unused-vars */

const TargetCode = require('../../domain/targetCode');

class TargetCodeService {
  constructor(targetCodePersistAdapter) {
    this.targetCodePersistAdapter = targetCodePersistAdapter;
  }

  // Fetch a target module
  async fetchTargetCode(moduleId, targetCodePersistPort) {
    const targetCode = new TargetCode('');
    targetCode.moduleId = moduleId;
    return await targetCode.fetchTargetCode(targetCodePersistPort);
  }
}

module.exports = TargetCodeService;
