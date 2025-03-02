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

  async startConversation(userId, title) {
    const conversation = new Conversation(userId);
    await conversation.startConversation(title, this.chatPersistAdapter);
    // Publish "conversationStarted" event
    try {
      await this.chatMessagingAdapter.publish(this.topic, {
        event: 'conversationStarted',
        userId,
        conversationId: conversation.conversationId,
        title
      });
    } catch (error) {
      console.error('Error publishing conversationStarted event:', error);
    }
    return conversation.conversationId;
  }

  async fetchConversationsHistory(userId) {
    const conversationsHistory = new ConversationsHistory(userId);
    return await conversationsHistory.fetchConversationsList(this.chatPersistAdapter);
  }

  async fetchConversation(userId, conversationId) {
    const conversation = new Conversation(userId);
    return await conversation.fetchConversation(conversationId, this.chatPersistAdapter);
  }

  async renameConversation(userId, conversationId, newTitle) {
    const conversation = new Conversation(userId);
    await conversation.rename(conversationId, newTitle, this.chatPersistAdapter);
    // Publish "conversationRenamed" event
    try {
      await this.chatMessagingAdapter.publish(this.topic, {
        event: 'conversationRenamed',
        userId,
        conversationId,
        newTitle
      });
    } catch (error) {
      console.error('Error publishing conversationRenamed event:', error);
    }
  }

  async deleteConversation(userId, conversationId) {
    const conversation = new Conversation(userId, conversationId);
    await conversation.deleteConversation(this.chatPersistAdapter);
    // Publish "conversationDeleted" event
    try {
      await this.chatMessagingAdapter.publish(this.topic, {
        event: 'conversationDeleted',
        userId,
        conversationId
      });
    } catch (error) {
      console.error('Error publishing conversationDeleted event:', error);
    }
  }

  async sendQuestion(userId, conversationId, prompt) {
    const conversation = new Conversation(userId, conversationId);
    await conversation.sendQuestion(prompt, this.chatPersistAdapter, this.chatMessagingAdapter);
    // Publish "questionSent" event
    try {
      await this.chatMessagingAdapter.publish(this.topic, {
        event: 'questionSent',
        userId,
        conversationId,
        prompt
      });
    } catch (error) {
      console.error('Error publishing questionSent event:', error);
    }
    return prompt;
  }

  async sendAnswer(userId, conversationId, answer) {
    const conversation = new Conversation(userId, conversationId);
    await conversation.sendAnswer(answer, this.chatPersistAdapter);
    // Publish "answerSent" event
    try {
      await this.chatMessagingAdapter.publish(this.topic, {
        event: 'answerSent',
        userId,
        conversationId,
        answer
      });
    } catch (error) {
      console.error('Error publishing answerSent event:', error);
    }
    return answer;
  }
}

module.exports = ChatService;
