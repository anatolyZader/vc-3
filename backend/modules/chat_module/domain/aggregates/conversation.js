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


  start() {
    this.status = 'active';
    console.log(`Conversation ${this.conversationId} started.`);
  }


  delete() {
    this.status = 'deleted';
    console.log(`Conversation ${this.conversationId} deleted.`);
  }


  share() {
    this.status = 'shared';
    console.log(`Conversation ${this.conversationId} shared.`);
  }


  rename(newTitle) {
    this.title = newTitle;
    console.log(`Conversation renamed to: ${this.title}`);
  }


  editQuestion(questionID, newContent) {
    const question = this.questions.find(q => q.questionId === questionID);
    if (question) {
      question.updateContent(newContent);
      console.log(`Question ${questionID} updated.`);
    }
  }


  sendQuestion(question) {
    this.questions.push(question);
    this.chatService.sendQuestionToAI(question);
    console.log(`Question sent: ${question.content}`);
  }


  sendAnswer(answer) {
    this.answers.push(answer);
    this.chatService.saveAnswer(answer);
    console.log(`Answer sent: ${answer.content}`);
  }
}


module.exports = Conversation;
