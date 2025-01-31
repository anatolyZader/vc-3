'use strict';

const renameProjectSchema = {
  $id: 'schema:git:rename-project',
  type: 'object',
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string', format: 'uuid' }
    }
  },
  body: {
    type: 'object',
    required: ['newName'],
    properties: {
      newName: { type: 'string', minLength: 1, maxLength: 255 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

module.exports = renameProjectSchema;
