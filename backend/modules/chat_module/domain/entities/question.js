// question.js
'use strict';

const { v4: uuidv4 } = require('uuid');

class Question {
  constructor(prompt) {
    this.questionId = uuidv4();
    this.timestamp = new Date();
    this.prompt = prompt;  
  }

  async edit(newContent, IChatPersistPort) {
    this.timestamp = new Date();
    await IChatPersistPort.editQuestion(this.questionId, newContent);
  }
}

module.exports = Question;