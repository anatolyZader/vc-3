// conversation.js
/* eslint-disable no-unused-vars */


const { v4: uuidv4 } = require('uuid');

class Conversation {
  constructor(userId, conversationId = null) {
    this.userId = userId;
    this.conversationId = conversationId || uuidv4();
    this.messages = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async startConversation(IChatPersistPort, title = 'New Chat') {
    this.conversationId = uuidv4();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    
    await IChatPersistPort.startConversation(this.userId, title, this.conversationId);
    
    console.log(`[${new Date().toISOString()}] Conversation started: ${this.conversationId} for user: ${this.userId}`);
    return this.conversationId; 
  }

  async fetchConversation(conversationId, IChatPersistPort) {
    this.conversationId = conversationId;
    const conversation = await IChatPersistPort.fetchConversation(this.userId, conversationId);
    this.messages = conversation;
    return conversation;
  }

  async renameConversation(conversationId, newTitle, IChatPersistPort) {
    this.updatedAt = new Date();
    
    await IChatPersistPort.renameConversation(this.userId, conversationId, newTitle);
    
    console.log(`[${new Date().toISOString()}] Conversation renamed to: ${newTitle}`);
  }

  async deleteConversation(conversationId, IChatPersistPort) {
    await IChatPersistPort.deleteConversation(this.userId, conversationId);
    console.log(`[${new Date().toISOString()}] Conversation deleted: ${conversationId}`);
  }

  async addQuestion(conversationId, prompt, IChatPersistPort) {
    const messageId = await IChatPersistPort.addQuestion(this.userId, conversationId, prompt);
    
    console.log(`[${new Date().toISOString()}] Question added: ${messageId}`);
    return messageId;
  }

  async addAnswer(conversationId, answer, IChatPersistPort) {
    // Handle both string and object answers
    const answerContent = typeof answer === 'string' ? answer : answer.content || answer.response || answer;
    
    const messageId = await IChatPersistPort.addAnswer(this.userId, conversationId, answerContent);
    
    console.log(`[${new Date().toISOString()}] Answer added: ${messageId}`);
    return messageId;
  }

  equals(other) {
    if (!(other instanceof Conversation)) return false;
    return (
      this.conversationId === other.conversationId &&
      this.userId === other.userId
    );
  }
}

module.exports = Conversation;