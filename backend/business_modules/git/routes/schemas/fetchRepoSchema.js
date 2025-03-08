// fetchRepoSchema.js
'use strict';
module.exports = {
  $id: 'schema:git:fetch-repo',
  params: {
    type: 'object',
    required: ['repoId'],
    properties: {
      repoId: {
        type: 'string',
        format: 'uuid',
      }
    },
    additionalProperties: false
  }
};


