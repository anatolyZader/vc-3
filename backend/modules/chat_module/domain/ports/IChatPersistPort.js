// IChatPersistPort.js

/* eslint-disable no-unused-vars */
'use strict';

class IChatPersistPort {
  constructor() {
    if (new.target === IChatPersistPort) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async startConversation(userId, newConversation) {
    throw new Error('Method not implemented.');
  }

  async deleteConversation(userId, conversationId) {
    throw new Error('Method not implemented.');
  }

  async shareConversation(conversationId) {
    throw new Error('Method not implemented.');
  }

  async renameConversation(userId, conversationId, newTitle) {
    throw new Error('Method not implemented.');
  }

  async fetchConversationHistory(userId) {
    throw new Error('Method not implemented.');
  }

  async fetchConversation(userId, conversationId) {
    throw new Error('Method not implemented.');
  }

  async sendQuestion(userId, conversationId, question) {
    throw new Error('Method not implemented.');
  }

  async editQuestion(questionId, newContent) {
    throw new Error('Method not implemented.');
  }

  async searchInConversations(userId, query) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IChatPersistPort;
