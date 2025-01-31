'use strict';

const removeRepositorySchema = {
  $id: 'schema:git:remove-repository',
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

module.exports = removeRepositorySchema;
