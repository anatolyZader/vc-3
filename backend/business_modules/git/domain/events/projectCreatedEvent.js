// ProjectCreatedEvent.js
class ProjectCreatedEvent {
  constructor({ userId, projectId, title, occurredAt = new Date() }) {
    this.userId = userId;
    this.projectId = projectId;
    this.title = title;
    this.occurredAt = occurredAt;
  }
}
module.exports = ProjectCreatedEvent;
