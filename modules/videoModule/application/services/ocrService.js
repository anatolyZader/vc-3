'strict'
// ocrService.js
class OcrService {
    constructor(snapshot, ocrAdapter, postgresAdapter) {
        this.snapshot = snapshot;
        this.ocrAdapter = ocrAdapter;
        this.postrgresAdapter = postgresAdapter;
    }
    async extractCode(imageUrl, ocrAdapter, postgresAdapter) {
        try {
            await this.snapshot.captureCode(imageUrl, ocrAdapter, postgresAdapter);
        } catch (error) {
            console.error('Error extracting code:', error);
            throw error;
        }
    }

    async extractText(imageUrl, ocrAdapter, postrgresAdapter) {
        try {
            return await this.snapshot.captureText(imageUrl, ocrAdapter, postrgresAdapter);
        } catch (error) {
            console.error('Error extracting text:', error);
            throw error;
        }
    }
}

module.exports = OcrService;
