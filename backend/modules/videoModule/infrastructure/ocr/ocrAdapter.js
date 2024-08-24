
const Tesseract = require('tesseract.js');
const IOCRPort = require('../../domain/ports/IOCRPort');

class OCRAdapter extends IOCRPort {
  async extractText(imageUrl) {
    try {
      const result = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: m => console.log(m),
        }
      );
      return result.data.text;
    } catch (error) {
      console.error('Error during text extraction:', error);
      throw error;
    }
  }

  async extractCode(imageUrl) {
    try {
      const result = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: m => console.log(m),
        }
      );
      return result.data.text;
    } catch (error) {
      console.error('Error during code extraction:', error);
      throw error;
    }
  }
}

module.exports = OCRAdapter;