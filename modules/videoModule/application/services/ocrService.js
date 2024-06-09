// ocrService.js

const snapshot = require('../../domain/entities/snapshot');  

async function extractCode(imageUrl) {
    try {
        const codeSnippet = await snapshot.captureCode(imageUrl);
        return codeSnippet;
    } catch (error) {
        console.error('Error extracting code:', error);
        throw error;
    }
}

async function extractText(imageUrl) {
    try {
        const textSnippet = await snapshot.captureText(imageUrl);
        return textSnippet;
    } catch (error) {
        console.error('Error extracting text:', error);
        throw error;
    }
}

// Export the service functions
module.exports = {
    extractCode,
    extractText
};
