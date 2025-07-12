'use strict';

const registerSchema = {
  $id: 'schema:auth:register',
  type: 'object',
  properties: {
    username: { type: 'string', maxLength: 50 },
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: 8, maxLength: 100 }
  },
  required: ['username', 'email', 'password'],
  additionalProperties: false
};

module.exports = registerSchema;