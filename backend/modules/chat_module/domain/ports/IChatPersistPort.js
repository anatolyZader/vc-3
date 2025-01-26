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

  async deleteConversation(conversationId) {
    throw new Error('Method not implemented.');
  }

  async shareConversation(conversationId) {
    throw new Error('Method not implemented.');
  }

  async renameConversation(conversationId, newTitle) {
    throw new Error('Method not implemented.');
  }

  async editQuestion(questionId, newContent) {
    throw new Error('Method not implemented.');
  }

  async sendQuestion(question, IChatPersistPort) {
    throw new Error('Method not implemented.');
  }

  async fetchConversations(userId) {
    throw new Error('Method not implemented.');
  }

  async searchInConversations(userId, query) {
    throw new Error('Method not implemented.');
  }

}











module.exports = IChatPersistPort;
