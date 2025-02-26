'strict'
// Transcript.js
const { v4: uuidv4 } = require('uuid');
const IDatabasePort = require('../ports/IVideoPersistPort');
const { IAIPort } = require('../../domain/ports/IAIPort');

class Transcript {
    constructor(videoYoutubeId) {
        this.videoYoutubeId = videoYoutubeId;
        this.transcriptId = uuidv4();
        this.text = '';
        this.databasePort = IDatabasePort;
        this.aiPort = IAIPort;
    }

    translateTranscript() {
        return this.aiPort.translateTranscript('stub transcript');
    }
}

module.exports = Transcript;
