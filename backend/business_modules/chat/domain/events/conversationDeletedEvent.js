// ConversationDeletedEvent.js
class ConversationDeletedEvent {
  constructor({ userId, conversationId, occurredAt = new Date() }) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.occurredAt = occurredAt;
  }
}
module.exports = ConversationDeletedEvent;
