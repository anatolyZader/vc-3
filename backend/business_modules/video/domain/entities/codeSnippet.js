'strict'
// CodeSnippet.js
const IOCRPort = require('../ports/IOCRPort');
const IDatabasePort = require('../ports/IVideoPersistPort');
const { v4: uuid } = require('uuid');

class CodeSnippet {
  constructor(code) {
    this.codeSnippetId = uuid();
    this.code = code;
    this.ICodeSnippetPort = IOCRPort;
    this.IDatabasePort = IDatabasePort;
  }

  async explainCode(code, ICodeSnippetPort,  IDatabasePort) {
    console.log('Explaining code!');
    const codeExplanation =  await ICodeSnippetPort.explainCode(code);
    await IDatabasePort.saveCodeExplanation(codeExplanation);

  }
}

module.exports = CodeSnippet;