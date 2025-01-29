// prompt.js
'use strict';

const { v4: uuidv4 } = require('uuid');
const PromptContent = require('../value-objects/promptContent');

class Prompt {
  constructor(content) {
    this.promptId = uuidv4();
    this.content = new PromptContent(content);
  }

  equals(other) {
    if (!(other instanceof Prompt)) return false;
    return this.promptId === other.promptId && this.content.equals(other.content);
  }
}

module.exports = Prompt;
