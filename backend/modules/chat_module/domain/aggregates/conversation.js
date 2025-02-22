// conversation.js
/* eslint-disable no-unused-vars */
'use strict';

const { v4: uuidv4 } = require('uuid');
const ConversationTitle = require('../value_objects/conversationTitle');
const IChatPersistPort = require('../ports/IChatPersistPort');
const IChatMessagingPort = require('../ports/IChatMessagingPort');

class Conversation {
  constructor(userId, title = '') {
    this.userId = userId;
    this.conversationId = uuidv4();
    this.title = new ConversationTitle(title);
    this.status = 'active';  // active, archived, etc.
    this.history = [];
    this.questions = [];
    this.answers = [];
  }

  async start(IChatPersistPort) {
    const newConversation = {
      conversationId: this.conversationId,
      title: this.title.toString(),
      startDate: new Date(),
    };
    await IChatPersistPort.startConversation(this.userId, newConversation);
    console.log(`Conversation ${newConversation.conversationId} started for user ${this.userId}.`);
  }

  async rename(newTitle, IChatPersistPort) {
    this.title = new ConversationTitle(newTitle);
    await IChatPersistPort.renameConversation(this.conversationId, this.title.toString());
    console.log(`Conversation renamed to: ${this.title}`);
  }
//  is it right that we need langchain functionality only in sending questions here and the answers are just recorded?
  async sendQuestion(question, IChatPersistPort) {
    await IChatPersistPort.saveQuestion(question);
    await IChatMessagingPort.sendQuestion(question);
    console.log(`Question sent: ${question.content}`);
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
