'use strict';

const fetchRepositorySchema = {
  "$id": "schema:git:fetch-repository",
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  params: {
    type: 'object',
    required: ['repositoryId'],
    properties: {
      repositoryId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string' },
        repositoryUrl: { type: 'string' },
      },
      required: ['repositoryId', 'repositoryUrl'],
    },
  }
};

module.exports = fetchRepositorySchema;
