// chatService.js
'use strict';
/* eslint-disable no-unused-vars */
const Conversation = require('../../domain/aggregates/conversation');
const ConversationsHistory = require('../../domain/entities/conversationsHistory');
const IChatService = require('./interfaces/IChatService');

class ChatService extends IChatService {
  constructor(chatPersistAdapter, chatMessagingAdapter) {
    super();
    this.chatPersistAdapter = chatPersistAdapter;
    this.chatMessagingAdapter = chatMessagingAdapter;
    this.topic = 'chat'; // dedicated topic for chat events
  }

  async startConversation(userId) {
    const conversation = new Conversation(userId);
    await conversation.startConversation( this.chatPersistAdapter);
    return conversation.conversationId;
  }

  async fetchConversationsHistory(userId) {
    const conversationsHistory = new ConversationsHistory(userId);
    return await conversationsHistory.fetchConversationsHistory(this.chatPersistAdapter);
  }

  async fetchConversation(userId, conversationId) {
    const conversation = new Conversation(userId);
    return await conversation.fetchConversation(conversationId, this.chatPersistAdapter);
  }

  async addQuestion(userId, conversationId, prompt) {
    const conversation = new Conversation(userId);
    await conversation.addQuestion(conversationId, prompt, this.chatPersistAdapter);
    await this.chatMessagingAdapter.addQuestion(userId, conversationId, prompt);
    return prompt;
  }

  async addAnswer(userId, conversationId, answer) {
    const conversation = new Conversation(userId, conversationId);
    await conversation.addAnswer(conversationId, answer, this.chatPersistAdapter);
    return answer;
  }

  async renameConversation(userId, conversationId, newTitle) {
    const conversation = new Conversation(userId);
    await conversation.renameConversation(conversationId, newTitle, this.chatPersistAdapter);
  };

  async deleteConversation(userId, conversationId) {
    const conversation = new Conversation(userId);
    await conversation.deleteConversation(conversationId, this.chatPersistAdapter);
  }

}

module.exports = ChatService;
