/* eslint-disable no-unused-vars */
const { v4: uuid } = require('uuid');
const ITextSnippetService = require('../../application/interfaces/ITextSnippetService');

class TextSnippet {
  constructor(ITextSnippetService) {
    this.textSnippetId = uuid();
    this.text = 'text';
    this.textSnippetService = ITextSnippetService;
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