'use strict';

const renameProjectSchema = {
  "$id": "schema:git:rename-project",
  body: {
    type: 'object',
    required: ['newTitle', 'userId'],
    properties: {
      newTitle: { type: 'string', minLength: 1 },
      userId: { type: 'string' },
    },
  },
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  }
};

module.exports = renameProjectSchema;
