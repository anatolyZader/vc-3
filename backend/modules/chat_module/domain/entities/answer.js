// answer.js
'use strict';

const { v4: uuidv4 } = require('uuid');

class Answer {
  constructor(content) {
    this.answerId = uuidv4();
    this.content = content;
    this.timestamp = new Date();
  }
}

module.exports = Answer;
