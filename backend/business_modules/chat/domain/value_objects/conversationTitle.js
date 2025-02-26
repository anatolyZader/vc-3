'use strict';

class ConversationTitle {
  constructor(title) {
    if (!title || typeof title !== 'string') {
      throw new Error('Invalid conversation title.');
    }
    this.title = title.trim();
  }

  equals(other) {
    if (!(other instanceof ConversationTitle)) return false;
    return this.title === other.title;
  }

  toString() {
    return this.title;
  }
}

module.exports = ConversationTitle;
