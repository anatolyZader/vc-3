// WikiRepoId.js
'use strict';

class WikiRepoId {
  constructor(id) {
    this.id = id;
  }
  toString() {
    return String(this.id);
  }
}

module.exports = WikiRepoId;
