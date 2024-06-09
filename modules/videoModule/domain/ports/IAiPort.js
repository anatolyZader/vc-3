class IAIPort {
    constructor() {
      if (this.constructor === IAIPort) {
        throw new Error("Abstract classes can't be instantiated.");
      }
    }
  
    explainText(text) {
      throw new Error('Method not implemented.');
    }
  
    translateText(text) {
      throw new Error('Method not implemented.');
    }
  
    explainCode(code) {
      throw new Error('Method not implemented.');
    }
  
    translateTranscript(transcript) {
      throw new Error('Method not implemented.');
    }
  }
  
  module.exports = IAIPort;