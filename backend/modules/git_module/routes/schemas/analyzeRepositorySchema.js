'use strict';

const analyzeRepositorySchema = {
  $id: 'schema:git:analyze-repository',
  type: 'object',
  params: {
    type: 'object',
    required: ['repositoryId'],
    properties: {
      repositoryId: { type: 'string', format: 'uuid' }
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

module.exports = analyzeRepositorySchema;
