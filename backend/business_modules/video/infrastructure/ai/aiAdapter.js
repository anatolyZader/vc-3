const IAIPort = require('../../domain/ports/IAIPort');

class AIAdapter extends IAIPort {
  constructor(text, code) {
    super();
    this.text = text;
    this.code = code;
    this.testVar = 'testVar';
  }

  async explainText(text) {
    console.log('Explaining text!');
    return 'text explanation ' + text;
  }

  async translateText(text) {
    console.log('Translating text!');
    return 'text translation ' + text;
  }

  async explainCode(code) {
    console.log('Explaining code!');
    return `'code explanation' for ${code}`;
  }

  async translateTranscript(transcript) {
    console.log('Translating transcript!');
    return 'transcript translation ' + transcript;
  }
}

module.exports = AIAdapter;