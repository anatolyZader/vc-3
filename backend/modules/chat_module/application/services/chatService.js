'use strict';

const Conversation = require('../domain/conversation');
const ConversationHistory = require('../domain/conversationsHistory');
const Question = require('../domain/question');

class ChatService {
  constructor(chatPersistPort) {
    this.chatPersistPort = chatPersistPort;
  }

  async startConversation(userId, title, chatPersistAdapter) {
    const conversation = new Conversation(userId);
    await conversation.start(title, chatPersistAdapter);
    return conversation.conversationId;
  }

  async fetchConversationHistory(userId, chatPersistAdapter) {
    const conversationHistory = new ConversationHistory(userId);
    return await conversationHistory.fetchConversationsList(chatPersistAdapter);
  }

  async fetchConversation(userId, conversationId, chatPersistAdapter) {
    const conversationHistory = new ConversationHistory(userId);
    return await conversationHistory.fetchConversation(chatPersistAdapter);
  }

  async renameConversation(userId, conversationId, newTitle, chatPersistAdapter) {
    const conversation = new Conversation(userId);
    await conversation.rename(conversationId, newTitle, chatPersistAdapter);
  }

  async deleteConversation(userId, conversationId, chatPersistAdapter) {
    const conversationHistory = new ConversationHistory(userId);
    await conversationHistory.deleteConversation(conversationId, chatPersistAdapter);
  }

  async sendQuestion(userId, conversationId,  prompt, chatPersistAdapter) {
    const question = new Question(prompt);
    const conversation = new Conversation(userId);
    await conversation.sendQuestion(question, chatPersistAdapter);
    return question.questionId;
  }
}

module.exports = ChatService;
