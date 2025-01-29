// IChatService.js
/* eslint-disable no-unused-vars */
'use strict';

class IChatService {
  async startConversation(userId, title, chatPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async fetchConversationHistory(userId, chatPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async fetchConversation(userId, conversationId, chatPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async renameConversation(userId, conversationId, newTitle, chatPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async deleteConversation(userId, conversationId, chatPersistAdapter) {
    throw new Error("Method not implemented.");
  }

  async sendQuestion(userId, conversationId, prompt, chatPersistAdapter) {
    throw new Error("Method not implemented.");
  }
}

module.exports = IChatService;
