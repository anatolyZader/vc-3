/* eslint-disable no-unused-vars */
'use strict';

class IChatAiPort {
	constructor() {
		if (new.target === IChatAiPort) {
			throw new Error('Cannot instantiate an abstract class.');
		}
	}
    
	async nameConversation(params) {
		throw new Error('Method not implemented.');
	}
}

module.exports = IChatAiPort;
