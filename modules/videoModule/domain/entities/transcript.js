// Transcript.js
const { v4: uuidv4 } = require('uuid');
const IdatabasePort = require('../../ports/IdatabasePort');
const { IaiPort } = require('../../ports/IaiPort');

class Transcript {
    constructor(videoYoutubeId) {
        this.videoYoutubeId = videoYoutubeId;
        this.transcriptId = uuidv4();
        this.text = '';
        this.databasePort = {}; // Assuming you have a way to initialize this.
        this.aiPort = {}; // Assuming you have a way to initialize this.
    }

    translateTranscript() {
        return this.aiPort.translateTranscript('stub transcript');
    }
}

module.exports = Transcript;
