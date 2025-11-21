// projectId.js
'use strict';
class ProjectId {
  constructor(value) {
    if (!value || typeof value !== 'string') throw new Error('Invalid ProjectId');
    this.value = value;
  }
  equals(other) { return other instanceof ProjectId && this.value === other.value; }
  toString() { return this.value; }
}
module.exports = ProjectId;
