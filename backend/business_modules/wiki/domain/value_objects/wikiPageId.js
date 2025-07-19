// WikiPageId.js
'use strict';

class WikiPageId {
  constructor(id) {
    this.id = id;
  }
  toString() {
    return String(this.id);
  }
}

module.exports = WikiPageId;
