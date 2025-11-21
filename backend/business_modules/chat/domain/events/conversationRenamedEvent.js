// ConversationRenamedEvent.js
class ConversationRenamedEvent {
  constructor({ userId, conversationId, newTitle, occurredAt = new Date() }) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.newTitle = newTitle;
    this.occurredAt = occurredAt;
  }
}
module.exports = ConversationRenamedEvent;
