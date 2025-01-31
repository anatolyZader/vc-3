'use strict';

const addRepositorySchema = {
  $id: 'schema:git:add-repository',
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
    required: ['repositoryUrl'],
    properties: {
      repositoryUrl: { type: 'string', format: 'uri' }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

module.exports = addRepositorySchema;
