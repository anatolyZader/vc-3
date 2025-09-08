// httpApiSpec.js
class HttpApiSpec {
  constructor(value) {
    if (!value || typeof value !== 'object') throw new Error('Invalid HttpApiSpec');
    this.value = value;
  }
  equals(other) { return other instanceof HttpApiSpec && JSON.stringify(this.value) === JSON.stringify(other.value); }
}
module.exports = HttpApiSpec;
