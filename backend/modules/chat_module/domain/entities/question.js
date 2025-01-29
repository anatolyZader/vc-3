// question.js
'use strict';

const { v4: uuidv4 } = require('uuid');
const QuestionContent = require('../value_objects/questionContent');

class Question {
  constructor(content) {
    this.questionId = uuidv4();
    this.timestamp = new Date();
    this.content = new QuestionContent(content);
  }

  async edit(newContent, IChatPersistPort) {
    this.timestamp = new Date();
    this.content = new QuestionContent(newContent);
    await IChatPersistPort.editQuestion(this.questionId, this.content.toString());
  }

  equals(other) {
    if (!(other instanceof Question)) return false;
    return this.questionId === other.questionId && this.content.equals(other.content);
  }
}

module.exports = Question;
