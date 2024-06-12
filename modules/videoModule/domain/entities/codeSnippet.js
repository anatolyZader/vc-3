const { v4: uuid } = require('uuid');
const ICodeSnippetService = require('../../application/services/interfaces/ICodeSnippetService');

class CodeSnippet {
  constructor(code) {
    this.codeSnippetId = uuid();
    this.code = code;
    this.ICodeSnippetService = ICodeSnippetService;
  }

  async explainCode() {
    console.log('Explaining code!');
    return await this.ICodeSnippetService.explainCode(this.code);
  }
}

module.exports = CodeSnippet;