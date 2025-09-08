// pushedRepo.js
/* eslint-disable no-unused-vars */

'use strict';

const RepoPushedEvent = require('../events/repoPushedEvent');
const UserId = require('../value_objects/userId');
const RepoId = require('../value_objects/repoId');

class PushedRepo {
  constructor(userId, repoId) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    if (!(repoId instanceof RepoId)) throw new Error('repoId must be a RepoId value object');
    this.userId = userId;
    this.repoId = repoId;
  }

  async processPushedRepo(userId, repoId, repoData, IAIPort) {
    if (!(userId instanceof UserId)) throw new Error('userId must be a UserId value object');
    if (!(repoId instanceof RepoId)) throw new Error('repoId must be a RepoId value object');
    const response = await IAIPort.processPushedRepo(userId.value, repoId.value, repoData);
    console.log(`AI Response received: ${response}`);
    // Emit domain event
    const event = new RepoPushedEvent({
      userId: userId.value,
      repoId: repoId.value,
      repoData
    });
    return { response, event };
  }
}

module.exports = PushedRepo;
