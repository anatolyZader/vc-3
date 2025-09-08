// repoId.js
'use strict';
class RepoId {
  constructor(value) {
    if (!value || typeof value !== 'string') throw new Error('Invalid RepoId');
    this.value = value;
  }
  equals(other) { return other instanceof RepoId && this.value === other.value; }
  toString() { return this.value; }
}
module.exports = RepoId;
