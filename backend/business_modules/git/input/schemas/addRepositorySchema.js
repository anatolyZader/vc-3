'use strict';

const addRepositorySchema = {
  "$id": "schema:git:add-repository",
  body: {
    type: 'object',
    required: ['userId', 'repositoryUrl'],
    properties: {
      userId: { type: 'string' },
      repositoryUrl: { type: 'string', format: 'uri' },
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
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        repoId: { type: 'string' },
      },
      required: ['message', 'repoId'],
    },
  }
};

module.exports = addRepositorySchema;
