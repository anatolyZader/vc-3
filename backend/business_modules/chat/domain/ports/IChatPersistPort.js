/* eslint-disable no-unused-vars */
'use strict';

class IChatPersistPort {
  constructor() {
    if (new.target === IChatPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async startConversation(userId, title) {
    throw new Error('Method not implemented.');
  }

  async deleteConversation(userId, conversationId) {
    throw new Error('Method not implemented.');
  }

  async renameConversation(userId, conversationId, newTitle) {
    throw new Error('Method not implemented.');
  }

  async fetchConversationsHistory(userId) {
    throw new Error('Method not implemented.');
  }

  async fetchConversation(userId, conversationId) {
    throw new Error('Method not implemented.');
  }

  async sendQuestion(userId, conversationId, prompt) {
    throw new Error('Method not implemented.');
  }

  async searchInConversations(userId, query) {
    throw new Error('Method not implemented.');
  }

  async sendAnswer(userId, conversationId, answer) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IChatPersistPort;
