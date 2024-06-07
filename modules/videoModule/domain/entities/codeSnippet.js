const { v4: uuid } = require('uuid');
const CodeSnippetService = require('../../plugins/codeSnippetService');

class CodeSnippet {
  constructor(code, IcodeSnippetService) {
    this.codeSnippetId = uuid();
    this.code = code;
    this.codeSnippetService = IcodeSnippetService;
  }

  async explainCode() {
    console.log('Explaining code!');
    return await this.codeSnippetService.explainCode(this.code);
  }
}

module.exports = CodeSnippet;