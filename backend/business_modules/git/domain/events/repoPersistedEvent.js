// repoPersistedEvent.js
'use strict';

class RepoPersistedEvent {
  constructor({ userId, repoId, repo, branch = 'main', action = 'persist', forceUpdate = false, persistedAt = null }) {
    this.userId = userId;
    this.repoId = repoId;
    this.repo = repo;
    this.branch = branch;
    this.action = action;
    this.forceUpdate = forceUpdate;
    this.persistedAt = persistedAt || new Date().toISOString();
    this.eventType = 'RepoPersistedEvent';
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      repoId: this.repoId,
      repo: this.repo,
      branch: this.branch,
      action: this.action,
      forceUpdate: this.forceUpdate,
      persistedAt: this.persistedAt,
      timestamp: this.timestamp
    };
  }
}

module.exports = RepoPersistedEvent;