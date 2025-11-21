// ProjectRenamedEvent.js
class ProjectRenamedEvent {
  constructor({ userId, projectId, newTitle, occurredAt = new Date() }) {
    this.userId = userId;
    this.projectId = projectId;
    this.newTitle = newTitle;
    this.occurredAt = occurredAt;
  }
}
module.exports = ProjectRenamedEvent;
