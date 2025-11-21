/* eslint-disable no-unused-vars */
'use strict';

class IChatService {

  async startConversation(userId) {
    throw new Error("Method not implemented.");
  }

  async fetchConversationsHistory(userId) {
    throw new Error("Method not implemented.");
  }

  async fetchConversation(userId, conversationId) {
    throw new Error("Method not implemented.");
  }

  async renameConversation(userId, conversationId, newTitle) {
    throw new Error("Method not implemented.");
  }

  async deleteConversation(userId, conversationId) {
    throw new Error("Method not implemented.");
  }

  async addQuestion(userId, conversationId, prompt) {
    throw new Error("Method not implemented.");
  }

  async addAnswer(userId, conversationId, answer) {
    throw new Error("Method not implemented.");
  }

  async nameConversation(userId, conversationId) {
    throw new Error("Method not implemented.");
  }

  async addVoiceQuestion(userId, conversationId, audioBuffer, options = {}) {
    throw new Error("Method not implemented.");
  }
}

module.exports = IChatService;
