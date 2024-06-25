/* eslint-disable no-unused-vars */
class IOCRPort {
  constructor() {
    if (new.target === IOCRPort) {
      throw new Error("Cannot instantiate an abstract class.");
    }
  }

  // Method to extract code from an image URL
  async extractCode(imageUrl) {
    throw new Error("extractCode method must be implemented.");
  }

  // Method to extract text from an image URL
  async extractText(imageUrl) {
    throw new Error("extractText method must be implemented.");
  }
}

module.exports = IOCRPort;