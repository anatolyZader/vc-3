// answer.js

'use strict';

const { v4: uuidv4 } = require('uuid');
const AnswerContent = require('../value-objects/answerContent');

class Answer {
  constructor(content) {
    this.answerId = uuidv4();
    this.content = new AnswerContent(content);
    this.timestamp = new Date();
  }

  // [CHAT.JSX INTEGRATION] Added edit method to allow editing answers.
  async edit(newContent, IChatPersistPort) {
    this.timestamp = new Date();
    this.content = new AnswerContent(newContent);
    await IChatPersistPort.editAnswer(this.answerId, this.content.toString());
  }

  equals(other) {
    if (!(other instanceof Answer)) return false;
    return this.answerId === other.answerId && this.content.equals(other.content);
  }
}

module.exports = Answer;
