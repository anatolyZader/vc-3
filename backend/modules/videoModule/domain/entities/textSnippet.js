/* eslint-disable no-unused-vars */
'strict'
const { v4: uuid } = require('uuid');
const IAIPort = require('../ports/IAIPort');
const IDatabasePort = require('../ports/IDatabasePort');

class TextSnippet {
  constructor(text, IAIPort, IDatabasePort) {
    this.textSnippetId = uuid();
    this.text = text;
    this.IAIPort = IAIPort;
    this.IDatabasePort = IDatabasePort;
  }

  async explainText(videoYoutubeId, textSnippetId, IAIPort,  IDatabasePort) {
    console.log('Explaining text!');
    const text = await IDatabasePort.findText(textSnippetId);
    const textExplanation =  await IAIPort.explainText(text);
    await IDatabasePort.saveTextExplanation(textExplanation);
    return textExplanation;
  }

  async translateText(videoYoutubeId, textSnippetId, IAIPort,  IDatabasePort) {
    console.log('Translating text!');
    const text = await IDatabasePort.findText(textSnippetId);
    const textTranslation =  await IAIPort.translateText(text);
    await IDatabasePort.saveTextTranslation(textTranslation);
  
  }
}

module.exports = TextSnippet;