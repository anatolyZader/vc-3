/* eslint-disable no-unused-vars */
'use strict';
const fs = require('fs');
const path = require('node:path');

const AutoLoad = require('@fastify/autoload');
const { fastifyAwilixPlugin, diContainer, diContainerClassic, diContainerProxy } = require('@fastify/awilix');
const { asClass, asFunction, asValue } = require('awilix');

const schemaLoaderPlugin = require('./schemas/schemaLoaderPlugin');
const config = require('./config');
const auth = require('./auth');

// Imports required for dependency injection (video module)
const Video = require("./modules/videoModule/domain/aggregates/video");
const CodeSnippet = require("./modules/videoModule/domain/entities/codeSnippet");
const Snapshot = require("./modules/videoModule/domain/entities/snapshot");
const TextSnippet = require("./modules/videoModule/domain/entities/textSnippet");
const Transcript = require("./modules/videoModule/domain/entities/transcript");
const videoController = require('./modules/videoModule/plugins/videoController'); // plugin
const VideoAppService = require('./modules/videoModule/application/services/videoAppService');
const CodeSnippetService = require('./modules/videoModule/application/services/codeSnippetService');
const OcrService = require('./modules/videoModule/application/services/ocrService');
const TextSnippetService = require('./modules/videoModule/application/services/textSnippetService');
const VideoConstructService = require('./modules/videoModule/application/services/videoConstructService');
const AIAdapter = require('./modules/videoModule/infrastructure/ai/aiAdapter');
const PostgresAdapter = require('./modules/videoModule/infrastructure/database/postgresAdapter');
const OcrAdapter = require('./modules/videoModule/infrastructure/ocr/ocrAdapter');
const SnapshotAdapter = require('./modules/videoModule/infrastructure/youtube/snapshotAdapter');

// Imports required for dependency injection (auth module)
const Account = require('./modules/authModule/domain/entities/account');
const User = require('./modules/authModule/domain/entities/user');
const UserService = require('./authModuleServices/userService');
const AccountService = require('./authModuleServices/accountService');
const AuthPostgresAdapter = require('./modules/authModule/infrastructure/database/authPostgresAdapter');
const { AsyncLocalStorage } = require('node:async_hooks');

require('dotenv').config();

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
  await fastify.register(config);
  await fastify.register(auth);

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
    video: asClass(Video),
    codeSnippet: asClass(CodeSnippet),
    snapshot: asClass(Snapshot),
    textSnippet: asClass(TextSnippet),
    transcript: asClass(Transcript),
    videoAppService: asClass(VideoAppService), // defined
    codeSnippetService: asClass(CodeSnippetService), // defined
    aiAdapter: asValue(AIAdapter), // defined
    postgresAdapter: asClass(PostgresAdapter), // defined
    ocrAdapter: asClass(OcrAdapter), // defined
    ocrService: asClass(OcrService), // defined 
    videoController: asValue(videoController),      
    textSnippetService: asClass(TextSnippetService),
    videoConstructService: asClass(VideoConstructService),
    snapshotAdapter: asClass(SnapshotAdapter),
    account: asClass(Account),
    user: asClass(User),
    userService: asClass(UserService),
    authPostgresAdapter: asClass(AuthPostgresAdapter),
    accountService : asClass(AccountService),   
  });

    // Logging to check which imports are undefined
  const dependencies = {
    Video,
    CodeSnippet,
    Snapshot,
    TextSnippet,
    Transcript,
    VideoAppService,
    videoController,
    CodeSnippetService,
    OcrService,
    TextSnippetService,
    VideoConstructService,
    AIAdapter,
    PostgresAdapter,
    OcrAdapter,
    SnapshotAdapter,
    Account,
    User,
    AccountService,
    UserService,
    AuthPostgresAdapter,
  };

  await fastify.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true,
    strictBooleanEnforced: true,
  });


  for (const [key, value] of Object.entries(dependencies)) {
    console.log(`${key}:`, value !== undefined ? 'Defined' : 'Undefined');
  }


  // console.log('fastify.secrets.PORT at app.js:', fastify.secrets.PORT);
  // console.log('fastify.secrets.PG_CONNECTION_STRING at app.js:', fastify.secrets.PG_CONNECTION_STRING);

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
  
    const keyPath = fastify.secrets.SSL_KEY_PATH;
    const certPath = fastify.secrets.SSL_CERT_PATH;
    
    // Read the key and certificate files
    if (keyPath && certPath) {
      opts.https = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      console.log('HTTPS options configured.');
    } else {
      console.log('HTTPS options not provided in secrets. Starting in HTTP mode.');
    }

    await fastify.register(require('@fastify/postgres'), {
      connectionString: fastify.secrets.PG_CONNECTION_STRING,
    });
  });
};

module.exports.options = options;