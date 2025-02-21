'use strict';
/* eslint-disable no-unused-vars */
const Conversation = require('../../domain/aggregates/conversation');
const ConversationHistory = require('../../domain/entities/conversationsHistory');
const Question = require('../../domain/entities/question');
const pubsubTopics = require('../../../messaging/pubsub/pubsubTopics');

class ChatService {
  constructor(chatPersistAdapter, chatMessagingAdapter) {
    this.chatPersistAdapter = chatPersistAdapter;
    this.chatMessagingAdapter = chatMessagingAdapter;
  }

  async startConversation(userId, title) {
    const conversation = new Conversation(userId);
    await conversation.start(title, this.chatPersistAdapter);

    await this.chatMessagingAdapter.publish(pubsubTopics.CONVERSATION_STARTED, {
      conversationId: conversation.conversationId,
      userId,
      title,
    });

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
    await this.chatMessagingAdapter.publish(pubsubTopics.CONVERSATION_RENAMED, {
      conversationId,
      userId,
      newTitle,
    });
  }

  async deleteConversation(userId, conversationId) {
    const conversationHistory = new ConversationHistory(userId);
    await conversationHistory.deleteConversation(conversationId, this.chatPersistAdapter);
    await this.chatMessagingAdapter.publish(pubsubTopics.CONVERSATION_DELETED, {
      conversationId,
      userId,
    });
  }

  async sendQuestion(userId, conversationId, prompt) {
    const question = new Question(prompt);
    const conversation = new Conversation(userId);
    await conversation.sendQuestion(question, this.chatPersistAdapter);
    await this.chatMessagingAdapter.publish(pubsubTopics.QUESTION_SENT, {
      questionId: question.questionId,
      conversationId,
      userId,
      prompt,
    });
    
    return question.questionId;
  }
}

module.exports = ChatService;
