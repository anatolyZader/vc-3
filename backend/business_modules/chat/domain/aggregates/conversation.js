// conversation.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const ConversationTitle = require('../value_objects/conversationTitle');
const IChatPersistPort = require('../ports/IChatPersistPort');
const IChatMessagingPort = require('../ports/IChatMessagingPort');

class Conversation {
  constructor(userId, conversationId = null) {
    this.userId = userId;
    // Use the provided conversationId or generate a new one if absent
    this.conversationId = conversationId || uuidv4();
  }

  async startConversation(title,vIChatPersistPort) {
    await IChatPersistPort.startConversation(this.userId, title);
    console.log(`Conversation  started for user ${this.userId}.`);
  }

  async fetchConversation(conversationId, IChatPersistPort) {
    const conversation = await IChatPersistPort.fetchConversation(this.userId, conversationId);
    return conversation;
  }

  async renameConversation(newTitle, IChatPersistPort) {
    this.title = new ConversationTitle(newTitle);
    await IChatPersistPort.renameConversation(this.conversationId, this.title.toString());
    console.log(`Conversation renamed to: ${this.title}`);
  }

  async deleteConversation(IChatPersistPort) {
    await IChatPersistPort.deleteConversation(this.conversationId, IChatPersistPort);
    console.log(`Conversation deleted: ${this.conversationId}`);
  }

  async sendQuestion(prompt, IChatPersistPort) {
    await IChatPersistPort.saveQuestion(prompt);
    await IChatMessagingPort.sendQuestion(prompt);
    console.log(`Question sent: ${prompt}`);
  }

  async sendAnswer(answer, IChatPersistPort) {
    await IChatPersistPort.saveAnswer(answer);
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
