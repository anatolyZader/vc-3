// OcrService.js
const IOcrService = require('./services/IOcrService');
const snapshot = require('../../domain/entities/snapshot'); 

class OcrService extends IOcrService {
    async extractCode(imageUrl) {
        try {
            return await snapshot.captureCode(imageUrl);
        } catch (error) {
            console.error('Error extracting code:', error);
            throw error;
        }
    }

    async extractText(imageUrl) {
        try {
            return await snapshot.captureText(imageUrl);
        } catch (error) {
            console.error('Error extracting text:', error);
            throw error;
        }
    }
}

module.exports = OcrService;
