'use strict';

module.exports = {
  "$id": "schema:chat:fetch-conversations-history",
  "type": "object",
  // Empty body, params, and querystring is valid, but need an explicit type
  "response": {
    200: {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "created_at": { "type": "string", "format": "date-time" },
          "updated_at": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
};