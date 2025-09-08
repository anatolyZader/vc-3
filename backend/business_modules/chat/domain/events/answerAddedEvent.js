// AnswerAddedEvent.js
class AnswerAddedEvent {
  constructor({ userId, conversationId, answer, occurredAt = new Date() }) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.answer = answer;
    this.occurredAt = occurredAt;
  }
}
module.exports = AnswerAddedEvent;
