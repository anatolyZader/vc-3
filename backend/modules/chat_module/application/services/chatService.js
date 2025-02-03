'use strict';
/* eslint-disable no-unused-vars */
const Conversation = require('../../domain/aggregates/conversation');
const ConversationHistory = require('../../domain/entities/conversationsHistory');
const Question = require('../../domain/entities/question');

class ChatService {
  constructor(chatPersistAdapter) {
    this.chatPersistAdapter = chatPersistAdapter;
  }

  async startConversation(userId, title) {
    const conversation = new Conversation(userId);
    await conversation.start(title, this.chatPersistAdapter);
    return conversation.conversationId;
  }

  async fetchConversationHistory(userId) {
    const conversationHistory = new ConversationHistory(userId);
    return await conversationHistory.fetchConversationsList(this.chatPersistAdapter);
  }

  async fetchConversation(userId, conversationId) {
    const conversationHistory = new ConversationHistory(userId);
    return await conversationHistory.fetchConversation(this.chatPersistAdapter);
  }

  async renameConversation(userId, conversationId, newTitle) {
    const conversation = new Conversation(userId);
    await conversation.rename(conversationId, newTitle, this.chatPersistAdapter);
  }

  async deleteConversation(userId, conversationId) {
    const conversationHistory = new ConversationHistory(userId);
    await conversationHistory.deleteConversation(conversationId, this.chatPersistAdapter);
  }

  async sendQuestion(userId, conversationId,  prompt) {
    const question = new Question(prompt);
    const conversation = new Conversation(userId);
    await conversation.sendQuestion(question, this.chatPersistAdapter);
    return question.questionId;
  }
}

module.exports = ChatService;
