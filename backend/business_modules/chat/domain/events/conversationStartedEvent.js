// ConversationStartedEvent.js
class ConversationStartedEvent {
  constructor({ userId, conversationId, title, occurredAt = new Date() }) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.title = title;
    this.occurredAt = occurredAt;
  }
}
module.exports = ConversationStartedEvent;
