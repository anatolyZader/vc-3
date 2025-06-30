'use strict';

const removeRepositorySchema = {
  "$id": "schema:git:remove-repository",
  body: {
    type: 'object',
    required: ['userId', 'repoId'],
    properties: {
      userId: { type: 'string' },
      repoId: { type: 'string' },
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

module.exports = removeRepositorySchema;
