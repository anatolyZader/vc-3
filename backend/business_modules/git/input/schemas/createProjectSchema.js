'use strict';

const createProjectSchema = {
  $id: 'schema:git:create-project',
  type: 'object',
  body: {
    type: 'object',
    required: ['name', 'ownerId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      ownerId: { type: 'string', format: 'uuid' }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        projectId: { type: 'string', format: 'uuid' }
      }
    }
  }
};

module.exports = createProjectSchema;
