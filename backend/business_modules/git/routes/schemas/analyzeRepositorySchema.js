// analyzeRepositorySchema.js
'use strict';

module.exports = {
  $id: 'schema:git:analyze-repository',
  params: {
    type: 'object',
    required: ['repositoryId'],
    properties: {
      repositoryId: {
        type: 'string',
        format: 'uuid',
      }
    },
    additionalProperties: false
  }
};
