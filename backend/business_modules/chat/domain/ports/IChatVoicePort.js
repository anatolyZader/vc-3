/* eslint-disable no-unused-vars */
'use strict';

class IChatVoicePort {
	constructor() {
		if (new.target === IChatVoicePort) {
			throw new Error('Cannot instantiate an abstract class.');
		}
	}
    
	async textToSpeech(text, options) {
		throw new Error('Method not implemented.');
	}

	async speechToText(audioData, options) {
		throw new Error('Method not implemented.');
	}
}

module.exports = IChatVoicePort;
