/* eslint-disable no-unused-vars */
const { v4: uuid } = require('uuid');
const ItextSnippetService = require('../../application/interfaces/ItextSnippetService');

class TextSnippet {
  constructor(ItextSnippetService) {
    this.textSnippetId = uuid();
    this.text = 'text';
    this.textSnippetServicePort = ItextSnippetServicePort;
  }

  async explainText() {
    console.log('Explaining text!');
    return await this.textSnippetServicePort.explainText(this.text);
  }

  async translateText() {
    console.log('Translating text!');
    return await this.textSnippetServicePort.translateText(this.text);
  }
}

module.exports = TextSnippet;