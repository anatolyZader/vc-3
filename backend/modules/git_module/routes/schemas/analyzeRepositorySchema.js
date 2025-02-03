'use strict';

const analyzeRepositorySchema = {
  "$id": "schema:git:analyze-repository",
  body: {
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
        message: { type: 'string' },
        analysis: { type: 'object' },
      },
      required: ['message', 'analysis'],
    },
  }
};

module.exports = analyzeRepositorySchema;
