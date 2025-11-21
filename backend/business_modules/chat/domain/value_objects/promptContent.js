// promptContent.js
'use strict';

class PromptContent {
  constructor(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid prompt content.');
    }
    this.content = content.trim();
  }

  equals(other) {
    if (!(other instanceof PromptContent)) return false;
    return this.content === other.content;
  }

  toString() {
    return this.content;
  }
}

module.exports = PromptContent;
