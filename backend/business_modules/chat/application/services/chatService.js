// chatService.js
'use strict';
/* eslint-disable no-unused-vars */
const Conversation = require('../../domain/aggregates/conversation');
const ConversationsHistory = require('../../domain/entities/conversationsHistory');
const IChatService = require('./interfaces/IChatService');


class ChatService extends IChatService {
  constructor({chatPersistAdapter, chatMessagingAdapter}) {
    super();
    this.chatPersistAdapter = chatPersistAdapter;
    this.chatMessagingAdapter = chatMessagingAdapter;
    this.topic = 'chat'; // dedicated topic for chat events
  }

  async startConversation(userId, title = 'New Conversation') {
    const conversation = new Conversation(userId);
    await conversation.startConversation( this.chatPersistAdapter, title);
    return conversation.conversationId;
  }

  async fetchConversationsHistory(userId) {
    const conversationsHistory = new ConversationsHistory(userId);
    return await conversationsHistory.fetchConversationsHistory(this.chatPersistAdapter);
  }

  async fetchConversation(userId, conversationId) {
    const conversation = new Conversation(userId);
    await conversation.fetchConversation(conversationId, this.chatPersistAdapter);
    await this.chatMessagingAdapter.fetchConversation({userId, conversationId});
    return conversation;
  }

  async addQuestion(userId, conversationId, prompt) {
    const conversation = new Conversation(userId);
    await conversation.addQuestion(conversationId, prompt, this.chatPersistAdapter);
    await this.chatMessagingAdapter.addQuestion({userId, conversationId, prompt});
    return prompt;
  }

  async addAnswer(userId, conversationId, answer) {
    const conversation = new Conversation(userId, conversationId);
    await conversation.addAnswer(conversationId, answer, this.chatPersistAdapter);
    await this.chatMessagingAdapter.addAnswer({userId, conversationId, answer});
    return answer;
  }

  async renameConversation(userId, conversationId, newTitle) {
    const conversation = new Conversation(userId);
    await conversation.renameConversation(conversationId, newTitle, this.chatPersistAdapter);
    await this.chatMessagingAdapter.renameConversation({userId, conversationId, newTitle});
    return newTitle;
  };

  async deleteConversation(userId, conversationId) {
    const conversation = new Conversation(userId);
    await conversation.deleteConversation(conversationId, this.chatPersistAdapter);
    await this.chatMessagingAdapter.deleteConversation({userId, conversationId});
    return conversationId;
  }

}

module.exports = ChatService;
