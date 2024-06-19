/* eslint-disable no-unused-vars */
'use strict';

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');
const { fastifyAwilixPlugin } = require('@fastify/awilix');
const { diContainer, diContainerClassic, diContainerProxy } = require('@fastify/awilix');
const { asClass, asFunction, asValue } = require('awilix');
const schemaLoaderPlugin = require('./schemas/schemaLoaderPlugin');

// Imports required for dependency injection
const SimpleService = require('./simpleService');
const { videoController } = require('./modules/videoModule/plugins/videoController');
const VideoAppService = require('./modules/videoModule/application/services/videoAppService');
const { takeSnapshot, downloadTranscript } = require('./modules/videoModule/application/services/videoAppService');
const CodeSnippetService = require('./modules/videoModule/application/services/codeSnippetService');
const OcrService = require('./modules/videoModule/application/services/ocrService');
const { TextSnippetService } = require('./modules/videoModule/application/services/textSnippetService');
const VideoConstructService = require('./modules/videoModule/application/services/videoConstructService');
const AiAdapter = require('./modules/videoModule/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./modules/videoModule/infrastructure/database/postgresAdapter');
const OcrAdapter = require('./modules/videoModule/infrastructure/ocr/ocrAdapter');
const { SnapshotAdapter } = require('./modules/videoModule/infrastructure/youtube/snapshotAdapter');
// const YoutubeDataAdapter = require('./modules/videoModule/infrastructure/youtube/youtubeDataAdapter');

const options = {
  disableRequestLogging: true,
  requestIdLogLabel: false,
  requestIdHeader: 'x-request-id',
  logger: {
    level: 'trace',
    timestamp: () => {
      const dateString = new Date(Date.now()).toISOString();
      return `,"@timestamp":"${dateString}"`;
    },
    redact: {
      censor: '***',
      paths: [
        'req.headers.authorization',
        'req.body.password',
        'req.body.email',
      ],
    },
    serializers: {
      req: function (request) {
        const shouldLogBody = request.context.config.logBody === true;
        return {
          method: request.method,
          url: request.raw.url,
          routeUrl: request.routerPath,
          version: request.headers?.['accept-version'],
          user: request.user?.id,
          headers: request.headers,
          body: shouldLogBody ? request.body : undefined,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort,
        };
      },
      res: function (reply) {
        return {
          statusCode: reply.statusCode,
          responseTime: reply.getResponseTime(),
        };
      },
    },
  },
};

module.exports = async function (fastify, opts) {
  await fastify.register(schemaLoaderPlugin);

  await fastify.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true,
    strictBooleanEnforced: true,
  });

  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'shared-plugins'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
  });
  
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'modules'),
    options: Object.assign({}, opts),
    encapsulate: false,
    maxDepth: 1,
  });

  await diContainer.register({
    simpleService: asClass(SimpleService),
    videoAppService: asClass(VideoAppService),
    videoController: asValue(videoController),
    codeSnippetService: asValue(CodeSnippetService),
    ocrService: asValue(OcrService),
    textSnippetService: asValue(TextSnippetService),
    videoConstructService: asValue(VideoConstructService),
    aiAdapter: asValue(AiAdapter),
    // postgresAdapter: asClass(PostgresAdapter),
    // ocrAdapter: asClass(OcrAdapter),
    snapshotAdapter: asValue(SnapshotAdapter),
    // youtubeDataAdapter: asClass(YoutubeDataAdapter),
  });

  const simpleService = fastify.diContainer.resolve('simpleService');
  console.log(simpleService.getMessage());

  console.log('fastify.secrets.PORT at app.js:', fastify.secrets.PORT);
  console.log('fastify.secrets.PG_CONNECTION_STRING at app.js:', fastify.secrets.PG_CONNECTION_STRING);

  await fastify.setErrorHandler(async (err, request, reply) => {
    if (err.validation) {
      reply.code(403);
      return err.message;
    }
    request.log.error({ err });
    reply.code(err.statusCode || 500);
    return "I'm sorry, there was an error processing your request.";
  });

  fastify.setNotFoundHandler(async (request, reply) => {
    reply.code(404);
    return "I'm sorry, I couldn't find what you were looking for.";
  });

  fastify.after(async () => {
    await fastify.register(require('@fastify/postgres'), {
      connectionString: fastify.secrets.PG_CONNECTION_STRING,
    });
    console.log('fastify.secret.PG_CONNECTION_STRING at app.js/after:', fastify.secrets.PG_CONNECTION_STRING);
  });
};

module.exports.options = options;
