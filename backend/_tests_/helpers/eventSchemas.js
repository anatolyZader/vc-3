"use strict";

const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: true, strict: false });

// API module event schemas
const httpApiSchemas = {
  fetchHttpApiRequest: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "fetchHttpApiRequest" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["userId", "repoId"],
        properties: {
          userId: { type: "string", minLength: 1 },
          repoId: { type: "string", minLength: 1 },
          correlationId: { type: "string", minLength: 1 },
        },
      },
    },
  },
  httpApiFetched: {
    type: "object",
    additionalProperties: false,
    required: ["event", "payload"],
    properties: {
      event: { const: "httpApiFetched" },
      payload: {
        type: "object",
        additionalProperties: true,
        required: ["correlationId"],
        properties: {
          correlationId: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

function getApiEventValidators() {
  return {
    validateFetchHttpApiRequest: ajv.compile(httpApiSchemas.fetchHttpApiRequest),
    validateHttpApiFetched: ajv.compile(httpApiSchemas.httpApiFetched),
  };
}

module.exports = { getApiEventValidators };
