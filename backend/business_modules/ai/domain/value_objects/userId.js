class UserId {
  constructor(value) {
    if (!value || typeof value !== 'string') throw new Error('Invalid UserId');
    this.value = value;
  }
  equals(other) { return other instanceof UserId && this.value === other.value; }
}
module.exports = UserId;