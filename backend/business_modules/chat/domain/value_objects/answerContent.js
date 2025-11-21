'use strict';

class AnswerContent {
  constructor(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid answer content.');
    }
    this.content = content.trim();
  }

  equals(other) {
    if (!(other instanceof AnswerContent)) return false;
    return this.content === other.content;
  }

  toString() {
    return this.content;
  }
}

module.exports = AnswerContent;
