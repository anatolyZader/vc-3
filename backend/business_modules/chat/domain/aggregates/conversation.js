// conversation.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const ConversationTitle = require('../value_objects/conversationTitle');

class Conversation {
  constructor(userId, conversationId = null) {
    this.userId = userId;
    this.conversationId = conversationId || uuidv4();
  }

  // Fix in conversation.js
  async startConversation(IChatPersistPort, title = 'New Chat') {

    this.conversationId = uuidv4();
    await IChatPersistPort.startConversation(this.userId, title, this.conversationId);
    return this.conversationId; 
  }
  async fetchConversation(conversationId, IChatPersistPort) {
    const conversation = await IChatPersistPort.fetchConversation(this.userId, conversationId);
    return conversation;
  }

  async renameConversation(conversationId,newTitle, IChatPersistPort) {
    this.title = new ConversationTitle(newTitle);
    await IChatPersistPort.renameConversation(this.userId, conversationId ,newTitle);
    console.log(`Conversation renamed to: ${this.title}`);
  }

  async deleteConversation(conversationId, IChatPersistPort) {
    await IChatPersistPort.deleteConversation(this.userId, conversationId);
    console.log(`Conversation deleted: ${this.conversationId}`);
  }

  async addQuestion(conversationId, prompt, IChatPersistPort) {
    await IChatPersistPort.addQuestion(this.userId, conversationId, prompt);
    console.log(`Question sent: ${prompt}`);
  }

  async addAnswer(conversationId, answer, IChatPersistPort) {
    await IChatPersistPort.addAnswer(this.userId, conversationId, answer);
    console.log(`Answer sent: ${answer.content}`);
  }

  equals(other) {
    if (!(other instanceof Conversation)) return false;
    return (
      this.conversationId === other.conversationId &&
      this.title.equals(other.title) &&
      this.status === other.status
    );
  }
}

module.exports = Conversation;
