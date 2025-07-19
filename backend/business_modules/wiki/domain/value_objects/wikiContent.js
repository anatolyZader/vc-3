// WikiContent.js
'use strict';

class WikiContent {
  constructor(content) {
    this.content = content;
  }
  toString() {
    return String(this.content);
  }
}

module.exports = WikiContent;
