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
    console.log(`paylod attached in chatService to the addQuestion() call to chatMessagingAdapter: userId = ${userId}, conversationId = ${conversationId} and prompt = ${prompt}`);
    const conversation = new Conversation(userId);
    await conversation.addQuestion(conversationId, prompt, this.chatPersistAdapter);
    await this.chatMessagingAdapter.addQuestion({userId, conversationId, prompt}); // the message goes to the ai module (data.event === 'questionSent') => aiLangchainAdapter / async respondToPrompt(userId, conversationId, repoId, prompt) 
    return prompt;
  }

  /**
   * Adds an answer to a conversation. Prevents event loop by not republishing if fromEvent is true.
   * @param {string} userId
   * @param {string} conversationId
   * @param {string} answer
   * @param {boolean} [fromEvent=false] - If true, do not republish event
   * @returns {string} answerId
   */
  async addAnswer(userId, conversationId, answer, fromEvent = false) {
    const conversation = new Conversation(userId, conversationId);
    const answerId = await conversation.addAnswer(conversationId, answer, this.chatPersistAdapter);
    if (!fromEvent) {
      await this.chatMessagingAdapter.addAnswer({userId, conversationId, answer, answerId});
    }
    return answerId;
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