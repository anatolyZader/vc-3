// QuestionAddedEvent.js
class QuestionAddedEvent {
  constructor({ userId, conversationId, prompt, occurredAt = new Date() }) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.prompt = prompt;
    this.occurredAt = occurredAt;
  }
}
module.exports = QuestionAddedEvent;
