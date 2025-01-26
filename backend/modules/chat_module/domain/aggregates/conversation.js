// conversation.js
/* eslint-disable no-unused-vars */
'use strict';


const { v4: uuidv4 } = require('uuid');
const Prompt = require('../entities/prompt');
const Question = require('../entities/question');
const Answer = require('../entities/answer');
const IChatPersistPort = require('../ports/IChatPersistPort')


class Conversation {
  constructor(
    userId
  ) {
    this.userId = userId;
    this.conversationId = uuidv4();
    this.title = '';
    this.status = 'active';  // active, archived, etc.
    this.history = [];
    this.questions = [];
    this.answers = [];
    this.init();  
  }


  async init() {
    try {
      const conversationHistoryData = await this.chatInitService.fetchConversationHistory(this.userId, this.conversationId);
      this.history = conversationHistoryData;
    } catch (error) {
      console.error("Error initializing conversation history:", error);
      throw error;
    }
  }

  async start(title, IChatPersistPort) {
    const newConversation = {
        conversationId: uuidv4(),
        title: title,
    //   status: conversation.status,  // active, archived, etc.
        startDate: new Date(),
    };
    await IChatPersistPort.startConversation(this.userId, newConversation);
    console.log(`Conversation ${newConversation.conversationId} started and added to history for user ${this.userId}.`);
  }

  async share(conversationId, IChatPersistPort) {
    await IChatPersistPort.shareConversation(conversationId);
    console.log(`Conversation ${this.conversationId} shared.`);
  }

  async rename(conversationId, newTitle, IChatPersistPort) {
    await IChatPersistPort.renameConversation(conversationId, newTitle);
    console.log(`Conversation renamed to: ${this.title}`);
  }

  
  async sendQuestion(question, IChatPersistPort) {
    await IChatPersistPort.saveQuestion(question);
    console.log(`Question sent: ${question}`);
  }


  //   async sendAnswer(answer) {
  // ...
  //   }
}


module.exports = Conversation;
