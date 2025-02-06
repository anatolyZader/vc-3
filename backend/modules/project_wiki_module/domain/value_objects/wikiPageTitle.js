// wikiPageTitle.js
'use strict';

class WikiPageTitle {
  constructor(title) {
    this.title = title.trim();
  }

  toString() {
    return this.title;
  }

  equals(other) {
    if (!(other instanceof WikiPageTitle)) return false;
    return this.title === other.title;
  }
}

module.exports = WikiPageTitle;
