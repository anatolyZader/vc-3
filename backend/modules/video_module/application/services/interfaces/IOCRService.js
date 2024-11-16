/* eslint-disable no-unused-vars */
// IOCRService.js
class IOCRService {
    constructor() {
        if (new.target === IOCRService) {
          throw new Error("Cannot instantiate an abstract class.");
        }};

    async extractCode(imageUrl) {
        throw new Error('Method not implemented.');
    }

    async extractText(imageUrl) {
        throw new Error('Method not implemented.');
    }
}

module.exports = IOCRService;
