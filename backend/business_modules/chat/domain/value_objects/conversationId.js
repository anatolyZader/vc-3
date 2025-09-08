// conversationId.js
'use strict';
class ConversationId {
  constructor(value) {
    if (!value || typeof value !== 'string') throw new Error('Invalid ConversationId');
    this.value = value;
  }
  equals(other) { return other instanceof ConversationId && this.value === other.value; }
  toString() { return this.value; }
}
module.exports = ConversationId;
