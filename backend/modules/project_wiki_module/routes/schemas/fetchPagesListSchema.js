'use strict';

module.exports = {
  $id: 'schema:wiki:fetch-pages-list',
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', format: 'uuid', description: 'Unique identifier of the user requesting the list of wiki pages.' }
    },
    additionalProperties: false
  }
};
