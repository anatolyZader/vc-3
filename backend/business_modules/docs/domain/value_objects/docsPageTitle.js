// docsPageTitle.js
'use strict';

class DocsPageTitle {
  constructor(title) {
    this.title = title.trim();
  }

  toString() {
    return this.title;
  }

  equals(other) {
    if (!(other instanceof DocsPageTitle)) return false;
    return this.title === other.title;
  }
}

module.exports = DocsPageTitle;
