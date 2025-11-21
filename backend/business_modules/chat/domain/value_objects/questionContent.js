// questionContent.js
'use strict';

class QuestionContent {
  constructor(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid question content.');
    }
    this.content = content.trim();
  }

  equals(other) {
    if (!(other instanceof QuestionContent)) return false;
    return this.content === other.content;
  }

  toString() {
    return this.content;
  }
}

module.exports = QuestionContent;
