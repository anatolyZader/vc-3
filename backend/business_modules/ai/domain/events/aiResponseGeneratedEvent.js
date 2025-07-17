class AiResponseGeneratedEvent {
  constructor({ userId, conversationId, prompt, response, occurredAt = new Date() }) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.prompt = prompt;
    this.response = response;
    this.occurredAt = occurredAt;
  }
}
module.exports = AiResponseGeneratedEvent;