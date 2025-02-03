'use strict';

const deleteProjectSchema = {
  "$id": "schema:git:delete-project",
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
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

module.exports = deleteProjectSchema;
