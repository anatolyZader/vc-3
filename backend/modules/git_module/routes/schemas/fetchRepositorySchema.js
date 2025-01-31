'use strict';

const fetchRepositorySchema = {
  $id: 'schema:git:fetch-repository',
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
        repositoryId: { type: 'string', format: 'uuid' },
        url: { type: 'string', format: 'uri' }
      }
    }
  }
};

module.exports = fetchRepositorySchema;
