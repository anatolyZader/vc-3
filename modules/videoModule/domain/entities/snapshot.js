/* eslint-disable no-unused-vars */
// snapshot.js
const { v4: uuidv4 } = require('uuid');
const { IOCRPort } = require('../ports/IOCRPort');
class Snapshot {
  constructor(videoId, timestamp, IocrPort, databasePort) {
    this.snapshotId = uuidv4();
    this.videoId = videoId;
    this.timestamp = timestamp;
    this.imageURL = 'stub imageURL';
    this.databasePort = databasePort;
    this.IocrPort = IocrPort;
  }

  async captureCode(imageURL) {
    console.log('Capturing displayed code!');
    const codeSnippet = await this.IocrPort.extractCode(imageURL);
    try {
      await this.databasePort.saveCodeSnippet(codeSnippet);
      console.log('Code snippet saved successfully!');
    } catch (error) {
      console.error('Error saving code snippet:', error);
    }
    return codeSnippet;
  }

  async captureText(imageURL) {
    console.log('Capturing displayed text!');
    const extractedText = await this.IocrPort.extractText(imageURL);
    try {
      await this.databasePort.saveTextSnippet(extractedText);
      console.log('Text snippet saved successfully!');
    } catch (error) {
      console.error('Error saving text snippet:', error);
    }
    return extractedText;
  }
}

module.exports = Snapshot;