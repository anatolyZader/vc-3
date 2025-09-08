class Prompt {
  constructor(text) {
    if (!text || typeof text !== 'string' || text.length < 1) throw new Error('Invalid Prompt');
    this.text = text;
  }
  equals(other) { return other instanceof Prompt && this.text === other.text; }
}
module.exports = Prompt;