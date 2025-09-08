class RepoId {
  constructor(value) {
    if (!value || typeof value !== 'string') throw new Error('Invalid RepoId');
    this.value = value;
  }
  equals(other) { return other instanceof RepoId && this.value === other.value; }
}
module.exports = RepoId;