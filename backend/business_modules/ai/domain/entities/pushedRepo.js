// pushedRepo.js
/* eslint-disable no-unused-vars */
'use strict';

class PushedRepo {
  constructor(userId, repoId) {
    this.userId = userId;  
    this.repoId = repoId; 
  }

  async processPushedRepo(userId, repoId, repoData, IAIPort) {
    const response = await IAIPort.processPushedRepo(userId, repoId,repoData);
    console.log(`AI Response received: ${response}`);
    return response;
  }
}

module.exports = PushedRepo;
