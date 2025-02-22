'use strict';
/* eslint-disable no-unused-vars */
const Conversation = require('../../domain/aggregates/conversation');
const ConversationHistory = require('../../domain/entities/conversationsHistory');
const Question = require('../../domain/entities/question');
const Answer = require('../../domain/entities/answer');
const pubsubTopics = require('../../../messaging/pubsub/pubsubTopics');

class ChatService {
  constructor(chatPersistAdapter, chatMessagingAdapter) {
    this.chatPersistAdapter = chatPersistAdapter;
    this.chatMessagingAdapter = chatMessagingAdapter;
  }

  async startConversation(userId, title) {
    const conversation = new Conversation(userId);
    await conversation.start(title, this.chatPersistAdapter);

    await this.chatPersistAdapter.saveConversation(conversation.conversationId, userId, title);
    await this.chatMessagingAdapter.startConversation(conversation.conversationId, userId, title);
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

  async sendQuestion(userId, conversationId, prompt) {
    const question = new Question(prompt);
    const conversation = new Conversation(conversationId);
    await conversation.sendQuestion(question, this.chatPersistAdapter, this.chatMessagingAdapter);    
    return question.questionId;
  }

  async sendAnswer(userId, conversationId, content) {
    const answer = new Answer(content);
    const conversation = new Conversation(userId);
    await conversation.sendAnswer(answer, this.chatPersistAdapter, this.chatMessagingAdapter);

    return answer.answerId;
  }
}

module.exports = ChatService;
