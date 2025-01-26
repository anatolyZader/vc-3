// prompt.js
'use strict';

const { v4: uuidv4 } = require('uuid');

class Prompt {
  constructor(content) {
    this.promptId = uuidv4();
    this.content = content;
  }
}


module.exports = Prompt;


