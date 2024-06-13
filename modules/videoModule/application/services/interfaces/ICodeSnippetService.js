// IcodeSnippetService.js
class ICodeSnippetService {
  constructor() {
  if (new.target === ICodeSnippetService) {
    throw new Error("Cannot instantiate an abstract class.");
  }};

  // eslint-disable-next-line no-unused-vars
  async explainCode(code) {
    throw new Error('Method not implemented.');
  }
}
  
module.exports = ICodeSnippetService;
  